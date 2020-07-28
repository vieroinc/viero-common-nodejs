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

/* HTTP 400- */
const http400 = ({ err, message = 'Bad Request' }) => errorCode(400, message, err);
const http401 = ({ err, message = 'Unauthorized' }) => errorCode(401, message, err);
const http402 = ({ err, message = 'Payment Required' }) => errorCode(402, message, err);
const http403 = ({ err, message = 'Forbidden' }) => errorCode(403, message, err);
const http404 = ({ err, message = 'Not Found' }) => errorCode(404, message, err);
const http405 = ({ err, message = 'Method Not Allowed' }) => errorCode(405, message, err);
const http409 = ({ err, message = 'Conflict' }) => errorCode(409, message, err);
const http412 = ({ err, message = 'Not Created' }) => errorCode(412, message, err);

/* HTTP 500- */
const http500 = ({ err, message = 'Internal Server Error' }) => errorCode(500, message, err);

/* WEBDAV 400- */
const webdav423 = ({ err, message = 'Locked' }) => errorCode(423, message, err);

/* WEBDAV 500- */
const webdav507 = ({ err, message = 'Insufficient Storage' }) => errorCode(507, message, err);

/* VIERO 900- */
const viero900 = ({ err, message = 'Client Aborted' }) => errorCode(900, message, err);
const viero999 = ({ err, message = 'Test' }) => errorCode(999, message, err);

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
