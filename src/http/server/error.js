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

class VieroHTTPError extends VieroError {
  constructor(code, message, userData) {
    super('VieroHTTPError', 846750, { ...userData, [HTTP_CODE]: code, [HTTP_MESSAGE]: message });
  }

  get httpMessage() {
    return this.get(HTTP_MESSAGE);
  }

  get httpCode() {
    return this.get(HTTP_CODE);
  }
}

/**
 * Creates an HTTP error. See convenience methods.
 */
const errorCode = ({ code, message, userData } = {}) => new VieroHTTPError(code, message, userData);

/* HTTP 400- */
const http400 = ({ message = 'Bad Request', userData } = {}) => errorCode({ code: 400, message, userData });
const http401 = ({ message = 'Unauthorized', userData } = {}) => errorCode({ code: 401, message, userData });
const http402 = ({ message = 'Payment Required', userData } = {}) => errorCode({ code: 402, message, userData });
const http403 = ({ message = 'Forbidden', userData } = {}) => errorCode({ code: 403, message, userData });
const http404 = ({ message = 'Not Found', userData } = {}) => errorCode({ code: 404, message, userData });
const http405 = ({ message = 'Method Not Allowed', userData } = {}) => errorCode({ code: 405, message, userData });
const http409 = ({ message = 'Conflict', userData } = {}) => errorCode({ code: 409, message, userData });
const http412 = ({ message = 'Not Created', userData } = {}) => errorCode({ code: 412, message, userData });

/* HTTP 500- */
const http500 = (
  err, { message = 'Internal Server Error', userData } = {},
) => errorCode({ code: 500, message, userData: { ...userData, [VieroError.KEY.ERROR]: err } });

/* WEBDAV 400- */
const webdav423 = ({ message = 'Locked', userData } = {}) => errorCode({ code: 423, message, userData });

/* WEBDAV 500- */
const webdav507 = ({ message = 'Insufficient Storage', userData } = {}) => errorCode({ code: 507, message, userData });

/* VIERO 900- */
const viero900 = ({ message = 'Client Aborted', userData } = {}) => errorCode({ code: 900, message, userData });
const viero999 = ({ message = 'Test', userData } = {}) => errorCode({ code: 999, message, userData });

module.exports = {
  VieroHTTPError,
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
