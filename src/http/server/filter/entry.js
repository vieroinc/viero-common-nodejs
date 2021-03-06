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

const { uuid } = require('@viero/common/uid');
const { VieroHTTPServerFilter } = require('./filter');
const { http400, http405 } = require('../error');
const { respondError, respondOk } = require('../respond');

const setCORSHeadersIfNeeded = (self, req, res, options) => {
  if (!options || !options.origins) {
    return;
  }
  const from = req.headers.origin || req.headers.referer;
  if (!from) {
    return;
  }

  try {
    const { hostname } = new URL(from);
    if (
      options.origins === 'any'
      || (
        options.origins.some
        && options.origins.some((allowedOriginEnding) => hostname.endsWith(allowedOriginEnding)) // TODO: seq read
      )
    ) {
      res.setHeader('Access-Control-Allow-Origin', `${from}`);
      // eslint-disable-next-line no-underscore-dangle
      res.setHeader('Access-Control-Allow-Methods', self.server.allowedMethods.join(', '));
      if (options.headers) {
        res.setHeader('Access-Control-Allow-Headers', options.headers.join(', '));
      }
      if (options.allowCredentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }
  } catch (e) {
    // nop
  }
};

class VieroEntryFilter extends VieroHTTPServerFilter {
  run(params, chain) {
    super.run(params, chain);

    const { req, res } = params;
    // eslint-disable-next-line no-underscore-dangle
    res._viero = params;

    if (req.httpVersion !== '1.1') {
      return respondError(res, http400());
    }

    Object.assign(params, {
      at: Date.now(),
      trackingId: uuid(),
    });

    if (req.headers['x-forwarded-for']) {
      // eslint-disable-next-line no-param-reassign
      params.remoteAddress = req.headers['x-forwarded-for'];
    } else if (req.connection && req.connection.remoteAddress) {
      // eslint-disable-next-line no-param-reassign
      params.remoteAddress = req.connection.remoteAddress;
    }

    setCORSHeadersIfNeeded(this, params.req, params.res, this.options);

    if (req.method === 'OPTIONS') {
      return respondOk(res);
    }
    const { allowedMethods } = this.server;
    if (!allowedMethods.includes(req.method)) {
      res.setHeader('Allow', allowedMethods.join(', '));
      return respondError(res, http405());
    }

    return chain.next();
  }
}

module.exports = { VieroEntryFilter };
