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

const log = new VieroLog('http/respond');

/**
 * Respond with code and payload if any.
 */
const respond = (res, code, payload) => {
  res.statusCode = code;
  if (payload) {
    if (isObject(payload) && !isBuffer(payload)) {
      try {
        // eslint-disable-next-line no-param-reassign
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

  if (log.isDebug()) {
    // eslint-disable-next-line no-underscore-dangle
    log.debug(`${Date.now() - res._viero.at}ms`, '-', res._viero.req.method, code, res._viero.req.url);
  }
  // eslint-disable-next-line no-underscore-dangle
  delete res._viero;
};

/*
 * Convenience methods.
 */
const respondOk = (res, payload) => respond(res, 200, payload);
const respondCreated = (res, payload) => respond(res, 201, payload);
const respondNoContent = (res) => respond(res, 204);
const respond2FARequired = (res) => respond(res, 250);
const respondNotModified = (res) => respond(res, 304);
const respondPartialContent = (res, payload) => respond(res, 406, payload);

const respondForward = (res, url) => {
  res.setHeader('location', url);
  respond(res, 307);
};

const respondError = (res, err) => {
  if (!err.httpCode) {
    // eslint-disable-next-line no-param-reassign
    delete err.stack;
    // eslint-disable-next-line no-param-reassign
    err = {
      httpCode: 500,
      msg: 'Internal Server Error',
      root: err,
    };
  }
  respond(res, err.httpCode, { error: err });
};

module.exports = {
  respond,
  respondOk,
  respondCreated,
  respondNoContent,
  respond2FARequired,
  respondNotModified,
  respondPartialContent,
  respondForward,
  respondError,
};
