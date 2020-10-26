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

const path = require('path');
const { readFile } = require('fs').promises;
const { promisify } = require('util');
const zlib = require('zlib');
const klaw = require('klaw');
const Negotiator = require('negotiator');
const { VieroLog } = require('@viero/common/log');
const { VieroError } = require('@viero/common/error');
const { VieroHTTPServerFilter } = require('../filter');
const {
  respond, respondOk, respondNotModified, respondError,
} = require('../../respond');
const { VieroThreads } = require('../../../../threads');
const { http404 } = require('../../error');

const log = new VieroLog('VieroStaticFilter');

const deflate = promisify(zlib.deflate);
const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

const DEFAULT_OPTIONS = {
  indexFileNames: ['index.html', 'index.htm'],
  mimes: {},
  // excludes: ['.DS_Store'],
  excludes: [],
  compress: {
    deflate: true,
    gzip: true,
    br: true,
  },
};
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

const processFile = (digestPool, mimes, compress = {}, { filePath, webPath }) => {
  const result = {
    filePath, webPath,
  };
  const mime = mimeOf(filePath, mimes);
  if (!mime) {
    if (log.isDebug()) {
      log.debug('excluding (no-mime)', filePath);
    }
    return Promise.resolve(result);
  }

  Object.assign(result, { mime: mime.mime, content: {} });
  return readFile(filePath)
    .then((buffer) => {
      Object.assign(result.content, { identity: buffer });
      return buffer;
    })
    .then((buffer) => digestPool
      .run(buffer)
      .then((digest) => {
        Object.assign(result, { digest });
        return buffer;
      }))
    .then((buffer) => {
      if (mime.compress && compress.deflate) {
        return deflate(buffer, { level: 9 })
          .then((deflated) => Object.assign(result.content, { deflate: deflated }))
          .then(() => buffer);
      }
      return buffer;
    })
    .then((buffer) => {
      if (mime.compress && compress.gzip) {
        return gzip(buffer, { level: 9 })
          .then((gzipped) => Object.assign(result.content, { gzip: gzipped }))
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
          .then((brotlied) => Object.assign(result.content, { br: brotlied }));
      }
      return buffer;
    })
    .then(() => result)
    .catch((err) => {
      Object.assign(result, err);
      return result;
    });
};

class VieroStaticFilter extends VieroHTTPServerFilter {
  constructor(server, options) {
    super(server, options);

    ['GET', 'HEAD'].forEach((method) => this.server.allowMethod(method));
    this._mimes = { ...DEFAULT_MIMES };

    this.server.get('/_static/manifest', ({ res }) => {
      const result = Object.entries(this._registry)
        .reduce((acc, [key, value]) => {
          acc[key] = { digest: value.digest, mime: value.mime };
          return acc;
        }, {});
      respondOk(res, result);
    }, 'serves static manifest (json)');

    // eslint-disable-next-line no-shadow
    this.server.get('/_static/:path...', ({ req: { pathParams: { path } }, res }) => {
      const entry = this._registry[path.slice(4)];
      if (entry) {
        respondOk(res, { digest: entry.digest, mime: entry.mime });
        return;
      }
      respondError(res, http404());
    }, 'used as "/_static/path/:path..." serves a single entry of the static manifest (json)');

    this._registry = {};
  }

  /**
   *
   * @param {*} options the filter options.
   */
  setup(options) {
    super.setup({ ...DEFAULT_OPTIONS, ...(options || {}) });

    if (!this.options.root) {
      throw new VieroError('VieroStaticFilter', 709226);
    }
    const digestPool = VieroThreads.createPool(path.join(__dirname, 'thread.hashing.js'), { max: 5 });
    const { indexFileNames } = this.options;
    this._mimes = { ...DEFAULT_MIMES, ...this.options.mimes };
    const rootLen = this.options.root.length;

    const proms = [];
    klaw(this.options.root)
      // eslint-disable-next-line no-shadow
      .on('data', ({ path, stats }) => {
        if (stats.isDirectory()) return;
        if (this.options.excludes.some((regexStr) => path.search(regexStr) > -1)) {
          if (log.isDebug()) {
            log.debug('excluding (excluded)', path);
          }
          return;
        }
        const filePath = path;
        const webPath = filePath.slice(rootLen);
        const fileName = webPath.split('/').pop();
        if (indexFileNames.includes(fileName)) {
          proms.push(processFile(digestPool, this._mimes, this.options.compress, {
            filePath,
            webPath: webPath.slice(0, -fileName.length),
          }));
          return;
        }
        proms.push(processFile(digestPool, this._mimes, this.options.compress, { filePath, webPath }));
      })
      .on('error', (err) => {
        if (log.isError()) {
          log.error(new VieroError('VieroStaticFilter', 737799, { [VieroError.KEY.ERROR]: err }));
        }
      })
      .on('end', () => {
        Promise.all(proms)
          .then((results) => {
            VieroThreads.terminatePool(digestPool);
            this._registry = results.reduce((acc, result) => {
              if (!result.err && result.mime) {
                const { webPath, ...item } = result;
                acc[webPath] = item;
              }
              return acc;
            }, {});
          });
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
    chain.next();
  }

  serve(params, statusCode, pathOverride) {
    const item = this._registry[pathOverride || params.req.path];
    if (!item) {
      respondError(http404());
      return;
    }
    const ifNoneMatch = params.req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch.replace(/"/g, '') === item.digest) {
      respondNotModified(params.res);
      return;
    }
    const negotiator = new Negotiator(params.req);
    const available = Object.keys(item.content);
    const allowed = negotiator.encodings(available);
    const encoding = ['br', 'deflate', 'gzip']
      .find((anEncoding) => allowed.includes(anEncoding) && available.includes(anEncoding)) || 'identity';
    params.res.setHeader('etag', item.digest);
    params.res.setHeader('cache-control', 'public, no-cache');
    params.res.setHeader('content-type', item.mime);
    params.res.setHeader('content-encoding', encoding);
    respond(params.res, statusCode, item.content[encoding]);
  }
}

module.exports = { VieroStaticFilter };
