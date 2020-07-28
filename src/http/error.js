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

const { VieroError } = require('@viero/common/error');

const HTTP_CODE = 'HTTP_CODE';

class VieroHttpError extends VieroError {
  constructor(code, message, err) {
    super('VieroHttpError', 846750, {
      ...(err ? { [VieroError.KEY.ERROR]: err } : {}),
      [HTTP_CODE]: code,
      [VieroError.KEY.MESSAGE]: message,
    });
  }

  get httpMessage() {
    return this.get(VieroError.KEY.MESSAGE);
  }

  get httpCode() {
    return this.get(HTTP_CODE);
  }
}

/**
 * Creates an HTTP error. See convenience methods.
 */
const errorCode = (code, message, err) => new VieroHttpError(code, message, err);

/* HTTP 200- */
const http250 = (message = '2FA Required') => errorCode(250, message);

/* HTTP 400- */
const http400 = (message = 'Bad Request') => errorCode(400, message);
const http401 = (message = 'Unauthorized') => errorCode(401, message);
const http402 = (message = 'Payment Required') => errorCode(402, message);
const http403 = (message = 'Forbidden') => errorCode(403, message);
const http404 = (message = 'Not Found') => errorCode(404, message);
const http405 = (message = 'Method Not Allowed') => errorCode(405, message);
const http409 = (message = 'Conflict') => errorCode(409, message);
const http412 = (message = 'Not Created') => errorCode(412, message);

/* HTTP 500- */
const http500 = (message = 'Internal Server Error', err) => errorCode(500, message, err);

/* WEBDAV 400- */
const webdav423 = (message = 'Locked', err) => errorCode(423, message, err);

/* WEBDAV 500- */
const webdav507 = (message = 'Insufficient Storage', err) => errorCode(507, message, err);

/* VIERO 900- */
const viero900 = (message = 'Client Aborted', err) => errorCode(900, message, err);
const viero999 = (message = 'Test', err) => errorCode(999, message, err);

module.exports = {
  VieroHttpError,
  errorCode,
  http250,
  http400,
  http401,
  http402,
  http403,
  http404,
  http405,
  http409,
  http412,
  http500,
  webdav423,
  webdav507,
  viero900,
  viero999,
};
