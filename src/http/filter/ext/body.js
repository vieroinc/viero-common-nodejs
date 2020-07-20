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

const { VieroHTTPServerFilter } = require('../filter');
const { jsonBody, formBody } = require('../../../utils/stream');

const readBody = (req) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    switch (req.headers['content-type']) {
      case 'application/json': return jsonBody(req);
      case 'application/x-www-form-urlencoded': return formBody(req);
      default: break;
    }
  }
  return Promise.resolve();
};

class VieroBodyFilter extends VieroHTTPServerFilter {
  run(params, chain) {
    super.run(params, chain);

    return readBody(params.req)
      .then((payload) => {
        params.req.body = (payload || null);
      })
      .then(() => {
        chain.next();
      });
  }
}

module.exports = { VieroBodyFilter };
