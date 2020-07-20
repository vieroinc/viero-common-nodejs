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

const crypto = require('crypto');
const querystring = require('querystring');
const stream = require('stream');
const zlib = require('zlib');

const { VieroError } = require('@viero/common/error');

const detectAbort = (inStream, outStream, shouldEnd, cb) => {
  let sourceFinished = false;
  let outputFinished = false;

  const tearDown = () => {
    // eslint-disable-next-line no-use-before-define
    inStream.removeListener('end', inStreamEnd);
    // eslint-disable-next-line no-use-before-define
    inStream.removeListener('error', inStreamErr);
    // eslint-disable-next-line no-use-before-define
    inStream.removeListener('close', inStreamClose);

    // eslint-disable-next-line no-use-before-define
    outStream.removeListener('error', outStreamErr);
    // eslint-disable-next-line no-use-before-define
    outStream.removeListener('close', outStreamClose);
    // eslint-disable-next-line no-use-before-define
    outStream.removeListener('finish', outStreamFinish);
  };

  const setup = () => {
    // eslint-disable-next-line no-use-before-define
    inStream.on('end', inStreamEnd);
    // eslint-disable-next-line no-use-before-define
    inStream.on('error', inStreamErr);
    // eslint-disable-next-line no-use-before-define
    inStream.on('close', inStreamClose);

    // eslint-disable-next-line no-use-before-define
    outStream.on('close', outStreamClose);
    // eslint-disable-next-line no-use-before-define
    outStream.on('error', outStreamErr);
    // eslint-disable-next-line no-use-before-define
    outStream.on('finish', outStreamFinish);
  };

  const inStreamErr = (err) => {
    tearDown();
    cb(new VieroError('utils/stream/detectAbort', 565201, { [VieroError.KEY.ERROR]: err }));
  };

  const inStreamEnd = () => {
    sourceFinished = true;
    if (shouldEnd) {
      outStream.end();
    } else {
      outputFinished = true;
    }
    if (sourceFinished && outputFinished) {
      tearDown();
      cb();
    }
  };

  const inStreamClose = () => {
    if (!sourceFinished) {
      if (shouldEnd) {
        outStream.end();
      } else {
        outputFinished = true;
      }
      tearDown();
      cb();
    }
  };
  const outStreamClose = () => {
    if (!outputFinished) {
      tearDown();
      cb();
    }
  };

  const outStreamErr = (err) => {
    tearDown();
    cb(new VieroError('utils/stream/detectAbort', 565202, { [VieroError.KEY.ERROR]: err }));
  };

  const outStreamFinish = () => {
    outputFinished = true;
    if (sourceFinished && outputFinished) {
      tearDown();
      cb();
    }
  };

  setup();
};

const decompressBody = (req) => {
  const encoding = (req.headers['content-encoding'] || 'identity').toLowerCase();
  const contentLength = req.headers['content-length'];
  let reqStream;

  switch (encoding) {
    case 'deflate': {
      reqStream = zlib.createInflate();
      req.pipe(reqStream);
      break;
    }
    case 'gzip': {
      reqStream = zlib.createGunzip();
      req.pipe(reqStream);
      break;
    }
    case 'identity': {
      reqStream = req;
      reqStream.length = contentLength;
      break;
    }
    default:
      return null;
  }

  return reqStream;
};

const parsedBody = (req, parser) => new Promise((resolve, reject) => {
  const chunks = [];

  const reqStream = decompressBody(req);
  if (!reqStream) {
    reject();
    return;
  }

  reqStream.on('data', (chunk) => chunks.push(chunk));

  reqStream.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const string = buffer.toString('utf8');
    if (!string || !string.length) {
      resolve({});
      return;
    }

    let something;
    try {
      something = parser(string, buffer);
    } catch (err) {
      // nop
    }
    if (!something) {
      resolve({});
      return;
    }
    resolve(something);
  });

  reqStream.on('error', () => reject());
});

const bufferBody = (req) => parsedBody(req, (str, buf) => buf);
const formBody = (req) => parsedBody(req, (str) => querystring.parse(str));
const jsonBody = (req) => parsedBody(req, JSON.parse);

class DigestStream extends stream.PassThrough {
  constructor(algorithm, options) {
    super(options);

    this._digester = crypto.createHash(algorithm);
    this._promise = Promise.defer();

    // let contentLength = 0;
    this.on('data', (chunk) => {
      // contentLength += chunk.byteLength;
      this._digester.update(chunk, 'binary');
    });

    this.on('error', (err) => {
      this._digester.reject(err);
    });

    this.on('end', () => {
      this._promise.resolve(this._digester.digest('hex'));
    });
  }

  onData() {
    return this._promise.promise;
  }
}

module.exports = {
  DigestStream, jsonBody, formBody, bufferBody, parsedBody, decompressBody, detectAbort,
};
