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

const HTTP_CODE = 'httpCode';
const HTTP_MESSAGE = 'httpMessage';

class VieroHttpError extends VieroError {
  constructor(code, message, userData) {
    super('VieroHttpError', 846750, { ...userData, [HTTP_CODE]: code, [HTTP_MESSAGE]: message });
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
const errorCode = (code, message, userData) => new VieroHttpError(code, message, userData);

/* HTTP 400- */
const http400 = (message = 'Bad Request', userData) => errorCode(400, message, userData);
const http401 = (message = 'Unauthorized', userData) => errorCode(401, message, userData);
const http402 = (message = 'Payment Required', userData) => errorCode(402, message, userData);
const http403 = (message = 'Forbidden', userData) => errorCode(403, message, userData);
const http404 = (message = 'Not Found', userData) => errorCode(404, message, userData);
const http405 = (message = 'Method Not Allowed', userData) => errorCode(405, message, userData);
const http409 = (message = 'Conflict', userData) => errorCode(409, message, userData);
const http412 = (message = 'Not Created', userData) => errorCode(412, message, userData);

/* HTTP 500- */
const http500 = (
  err, message = 'Internal Server Error', userData,
) => errorCode(500, message, { ...userData, [VieroError.ERROR]: err });

/* WEBDAV 400- */
const webdav423 = (message = 'Locked', userData) => errorCode(423, message, userData);

/* WEBDAV 500- */
const webdav507 = (message = 'Insufficient Storage', userData) => errorCode(507, message, userData);

/* VIERO 900- */
const viero900 = (message = 'Client Aborted', userData) => errorCode(900, message, userData);
const viero999 = (message = 'Test', userData) => errorCode(999, message, userData);

module.exports = {
  VieroHttpError,
  errorCode,
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
