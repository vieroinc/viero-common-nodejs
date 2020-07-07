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

const crypto = require("crypto");
const querystring = require("querystring");
const stream = require("stream");
const zlib = require("zlib");

const { VieroError } = require('@viero/common/error');

const detectAbort = (inStream, outStream, shouldEnd, cb) => {
  let sourceFinished = false;
  let outputFinished = false;

  const tearDown = () => {
    inStream.removeListener("end", inStreamEnd);
    inStream.removeListener("error", inStreamErr);
    inStream.removeListener("close", inStreamClose);

    outStream.removeListener("error", outStreamErr);
    outStream.removeListener("close", outStreamClose);
    outStream.removeListener("finish", outStreamFinish);
  };

  const setup = () => {
    inStream.on("end", inStreamEnd);
    inStream.on("error", inStreamErr);
    inStream.on("close", inStreamClose);

    outStream.on("close", outStreamClose);
    outStream.on("error", outStreamErr);
    outStream.on("finish", outStreamFinish);
  };

  const inStreamErr = (err) => {
    tearDown();
    cb(new VieroError("utils/stream/detectAbort", 565201));
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
    cb(new VieroError("utils/stream/detectAbort", 565202));
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
  const encoding = (req.headers["content-encoding"] || "identity").toLowerCase();
  const contentLength = req.headers["content-length"];
  let reqStream;

  switch (encoding) {
    case "deflate": {
      reqStream = zlib.createInflate();
      req.pipe(reqStream);
      break;
    }
    case "gzip": {
      reqStream = zlib.createGunzip();
      req.pipe(reqStream);
      break;
    }
    case "identity": {
      reqStream = req;
      reqStream.length = contentLength;
      break;
    }
    default:
      return null;
  }

  return reqStream;
};

const parsedBody = (req, parser) => {
  return new Promise((resolve, reject) => {
    const chunks = [];

    const reqStream = decompressBody(req);
    if (!reqStream) {
      return reject();
    }

    reqStream.on("data", (chunk) => chunks.push(chunk));

    reqStream.on("end", () => {
      let buffer = Buffer.concat(chunks);
      let string = buffer.toString("utf8");
      if (!string || !string.length) {
        return resolve({});
      }

      let something;
      try {
        something = parser(string, buffer);
      } finally {
        if (!something) {
          return resolve({});
        }
        resolve(something);
      }
    });

    reqStream.on("error", () => reject());
  });
};

const bufferBody = (req) => parsedBody(req, (str, buf) => buf);
const formBody = (req) => parsedBody(req, (str, buf) => querystring.parse(str));
const jsonBody = (req) => parsedBody(req, JSON.parse);

class DigestStream extends stream.PassThrough {
  constructor(algorithm, options) {
    super(options);

    this._digester = crypto.createHash(algorithm);
    this._promise = Promise.defer();

    let contentLength = 0;
    this.on("data", (chunk) => {
      contentLength += chunk.byteLength;
      this._digester.update(chunk, "binary");
    });

    this.on("error", (err) => {
      this._digester.reject(err);
    });

    this.on("end", () => {
      this._promise.resolve(this._digester.digest("hex"));
    });
  }

  onData() {
    return this._promise.promise;
  }
}

module.exports = {
  DigestStream, jsonBody, formBody, bufferBody, parsedBody, decompressBody, detectAbort,
};
