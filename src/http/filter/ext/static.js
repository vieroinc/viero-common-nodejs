
const fs = require('fs').promises;
const { promisify } = require('util');
const zlib = require("zlib");
const klaw = require('klaw');
const Negotiator = require('negotiator');
const { VieroHTTPServerFilter } = require('../filter');
const { VieroLog } = require('@viero/common/log');
const { VieroError } = require('@viero/common/error');
const { respondOk } = require('../../respond');

const log = new VieroLog('VieroStaticFilter');

const deflate = promisify(zlib.deflate);
const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

const _defaultMimes = {
  '\\.css$': { mime: 'text/css', compress: true },
  '\\.html$': { mime: 'text/html', compress: true },
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

const _mimeOf = (filePath, mimes) => {
  const key = Object.keys(mimes).find((regexStr) => -1 < filePath.search(regexStr));
  return mimes[key];
};

const _processFile = (registry, mimes, compress, { filePath, webPath }) => {
  const mime = _mimeOf(filePath, mimes);
  compress = compress || {}; // br, gzip, deflate
  registry[webPath] = { filePath, mime: mime.mime, content: {} };
  return fs.readFile(filePath)
    .then((buffer) => {
      Object.assign(registry[webPath].content, { identity: buffer });
      return buffer;
    })
    .then((buffer) => {
      if (mime.compress && compress.deflate) {
        return deflate(buffer, { level: 9 })
          .then((deflate) => Object.assign(registry[webPath].content, { deflate }))
          .then(() => buffer);
      }
      return buffer;
    })
    .then((buffer) => {
      if (mime.compress && compress.gzip) {
        return gzip(buffer, { level: 9 })
          .then((gzip) => Object.assign(registry[webPath].content, { gzip }))
          .then(() => buffer);
      }
      return buffer;
    })
    .then((buffer) => {
      if (mime.compress && compress.br) {
        return brotliCompress(buffer, {
          params: {
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length
          }
        })
          .then((br) => Object.assign(registry[webPath].content, { br }));
      }
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
    this._mimes = { ..._defaultMimes };
  }

  /**
   * 
   * @param {*} options the filter options.
   */
  setup(options = {}) {
    super.setup(options);

    if (!options.root) return;
    const root = options.root;
    const indexFileNames = options.indexFileNames || ['index.html', 'index.htm'];
    this._mimes = { ..._defaultMimes, ...(options.mimes || {}) };
    const rootLen = root.length;
    const _registry = {};
    if (!this._registry) {
      this._registry = _registry;
    }
    klaw(root)
      .on('data', ({ path, stats }) => {
        if (stats.isDirectory()) return;
        const filePath = path;
        const webPath = filePath.slice(rootLen);
        const fileName = webPath.split('/').pop();
        if (indexFileNames.includes(fileName)) {
          return _processFile(_registry, this._mimes, options.compress, {
            filePath,
            webPath: webPath.slice(0, -fileName.length),
          });
        }
        _processFile(_registry, this._mimes, options.compress, { filePath, webPath });
      })
      .on('error', (err) => {
        if (log.isError()) {
          log.error(new VieroError('VieroStaticFilter', 737799, { [VieroError.KEY.ERROR]: err }));
        }
      })
      .on('end', () => {
        if (this._registry !== _registry) this._registry = _registry;
      });
  }

  run(params, chain) {
    super.run(params, chain);
    const item = this._registry[params.req.path];
    if (!item) {
      return chain.next();
    }
    const negotiator = new Negotiator(params.req);
    const available = Object.keys(item.content);
    const allowed = negotiator.encodings(available);
    const encoding = ['br', 'deflate', 'gzip']
      .find((encoding) => allowed.includes(encoding) && available.includes(encoding)) || 'identity';
    params.res.setHeader("content-type", item.mime);
    params.res.setHeader("content-encoding", encoding);
    respondOk(params.res, item.content[encoding]);
    if (log.isDebug()) {
      log.debug(`${Date.now() - params.at}ms`, params.req.path);
    }
  }

}

module.exports = { VieroStaticFilter };
