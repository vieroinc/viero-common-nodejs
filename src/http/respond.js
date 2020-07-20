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

const { isObject, isBuffer } = require('lodash');
const { VieroLog } = require('@viero/common/log');

const log = new VieroLog('/http/respond');

/**
 * Respond with code and payload if any.
 */
const respond = (res, code, payload) => {
  res.statusCode = code;
  if (payload) {
    if (isObject(payload) && !isBuffer(payload)) {
      try {
        payload = JSON.stringify(payload);
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('content-length', Buffer.byteLength(payload));
      } catch (err) {
        // nop
      }
    } else if (isBuffer(payload)) {
      res.setHeader('content-length', Buffer.byteLength(payload));
    }
  }
  res.end(payload);
};

/**
 * Convenience for HTTP 200
 */
const respondOk = (res, payload) => {
  respond(res, 200, payload);
};

/**
 * Convenience for HTTP 201
 */
const respondCreated = (res, payload) => {
  respond(res, 201, payload);
};

/**
 * Convenience for HTTP 204
 */
const respondNoContent = (res) => {
  respond(res, 204);
};

/**
 * Convenience for HTTP 406
 */
const respondPartialContent = (res, payload) => {
  respond(res, 406, payload);
};

/**
 * Convenience for HTTP 307
 */
const respondForward = (res, url) => {
  res.statusCode = 307;
  res.setHeader('location', url);
  res.end();
};

/**
 * Convenience for errors
 */
const respondError = (res, err) => {
  /* TODO: what is this?
  if (900 === err.code) {
    return;
  }
  */
  if (!err.httpCode) {
    delete err.stack;
    err = {
      httpCode: 500,
      msg: 'Internal Server Error',
      root: err,
    };
  }
  if (log.isError()) {
    log.error('HTTP error', `${err.httpCode}/${err.root ? err.root.code : '-'}`, err);
  }
  respond(res, err.httpCode, { error: err });
};

module.exports = {
  respond,
  respondOk,
  respondCreated,
  respondNoContent,
  respondPartialContent,
  respondForward,
  respondError,
};
