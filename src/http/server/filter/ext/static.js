/**
 * Copyright 2020 Viero, Inc.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

const fs = require('fs').promises;
const { promisify } = require('util');
const zlib = require('zlib');
const klaw = require('klaw');
const Negotiator = require('negotiator');
const { VieroLog } = require('@viero/common/log');
const { VieroError } = require('@viero/common/error');
const { VieroHTTPServerFilter } = require('../filter');
const { respond } = require('../../respond');

const log = new VieroLog('VieroStaticFilter');

const deflate = promisify(zlib.deflate);
const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

const DEFAULT_MIMES = {
  '\\.css$': { mime: 'text/css', compress: true },
  '\\.htm$': { mime: 'text/html', compress: true },
  '\\.html$': { mime: 'text/html', compress: true },
  '\\.ico$': { mime: 'image/x-icon' },
  '\\.jpg$': { mime: 'image/jpeg' },
  '\\.jpeg$': { mime: 'image/jpeg' },
  '\\.js$': { mime: 'text/javascript', compress: true },
  '\\.json$': { mime: 'application/json', compress: true },
  '\\.js\\.map$': { mime: 'application/json', compress: true },
  '\\.mp4$': { mime: 'video/mp4' },
  '\\.png$': { mime: 'image/png' },
  '\\.svg$': { mime: 'image/svg+xml', compress: true },
  '\\.txt$': { mime: 'text/plain', compress: true },
  '\\.wasm$': { mime: 'application/wasm' },
  '\\.webmanifest$': { mime: 'application/manifest+json', compress: true },
  '\\.woff$': { mime: 'font/woff' },
  '\\.woff2$': { mime: 'font/woff2' },
  '\\.xml$': { mime: 'text/xml', compress: true },
};

const mimeOf = (filePath, mimes) => {
  const key = Object.keys(mimes).find((regexStr) => filePath.search(regexStr) > -1);
  return mimes[key];
};

const processFile = (registry, mimes, compress, { filePath, webPath }) => {
  // application/octet-stream
  const mime = mimeOf(filePath, mimes);
  // eslint-disable-next-line no-param-reassign
  compress = compress || {}; // br, gzip, deflate
  // eslint-disable-next-line no-param-reassign
  registry[webPath] = { filePath, mime: mime.mime, content: {} };
  return fs.readFile(filePath)
    .then((buffer) => {
      Object.assign(registry[webPath].content, { identity: buffer });
      return buffer;
    })
    .then((buffer) => {
      if (mime.compress && compress.deflate) {
        return deflate(buffer, { level: 9 })
          .then((deflated) => Object.assign(registry[webPath].content, { deflate: deflated }))
          .then(() => buffer);
      }
      return buffer;
    })
    .then((buffer) => {
      if (mime.compress && compress.gzip) {
        return gzip(buffer, { level: 9 })
          .then((gzipped) => Object.assign(registry[webPath].content, { gzip: gzipped }))
          .then(() => buffer);
      }
      return buffer;
    })
    .then((buffer) => {
      if (mime.compress && compress.br) {
        return brotli(buffer, {
          params: {
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
          },
        })
          .then((brotlied) => Object.assign(registry[webPath].content, { br: brotlied }));
      }
      return buffer;
    })
    .then(() => ({ webPath, entry: registry[webPath] }))
    .catch((err) => {
      if (log.isError()) {
        log.error(new VieroError('VieroStaticFilter', 737799, { [VieroError.KEY.ERROR]: err }));
      }
    });
};

class VieroStaticFilter extends VieroHTTPServerFilter {
  constructor(server) {
    super(server);

    ['GET', 'HEAD'].forEach((method) => this._server.allowMethod(method));
    this._mimes = { ...DEFAULT_MIMES };
  }

  /**
   *
   * @param {*} options the filter options.
   */
  setup(options = {}) {
    super.setup(options);

    if (!options.root) return;
    const indexFileNames = options.indexFileNames || ['index.html', 'index.htm'];
    this._mimes = { ...DEFAULT_MIMES, ...(options.mimes || {}) };
    const rootLen = options.root.length;
    const registry = {};
    if (!this._registry) {
      this._registry = registry;
    }
    klaw(options.root)
      .on('data', ({ path, stats }) => {
        if (stats.isDirectory()) return;
        if (options.excludes.some((regexStr) => path.search(regexStr) > -1)) {
          if (log.isDebug()) {
            log.debug('excluding', path);
          }
          return;
        }
        const filePath = path;
        const webPath = filePath.slice(rootLen);
        const fileName = webPath.split('/').pop();
        if (indexFileNames.includes(fileName)) {
          processFile(registry, this._mimes, options.compress, {
            filePath,
            webPath: webPath.slice(0, -fileName.length),
          });
          return;
        }
        processFile(registry, this._mimes, options.compress, { filePath, webPath });
      })
      .on('error', (err) => {
        if (log.isError()) {
          log.error(new VieroError('VieroStaticFilter', 737799, { [VieroError.KEY.ERROR]: err }));
        }
      })
      .on('end', () => {
        if (this._registry !== registry) this._registry = registry;
      });
  }

  run(params, chain) {
    super.run(params, chain);
    if (!this._registry[params.req.path]) {
      chain.next();
      return;
    }
    // eslint-disable-next-line no-param-reassign
    params.action = (theParams) => this.serve(theParams, 200);
  }

  serve(params, statusCode, pathOverride) {
    const item = this._registry[pathOverride || params.req.path];
    const negotiator = new Negotiator(params.req);
    const available = Object.keys(item.content);
    const allowed = negotiator.encodings(available);
    const encoding = ['br', 'deflate', 'gzip']
      .find((anEncoding) => allowed.includes(anEncoding) && available.includes(anEncoding)) || 'identity';
    params.res.setHeader('content-type', item.mime);
    params.res.setHeader('content-encoding', encoding);
    respond(params.res, statusCode, item.content[encoding]);
  }
}

module.exports = { VieroStaticFilter };
