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

const url = require('url');
const { uuid } = require('@viero/common/uid');
const { VieroHTTPServerFilter } = require('./filter');
const { http400, http405 } = require('../error');
const { respondError, respondOk } = require('../respond');

const setCORSHeadersIfNeeded = (req, res, options) => {
  if (!options || !options.origins) {
    return;
  }
  const from = req.headers.origin || req.headers.referer;
  if (!from) {
    return;
  }

  try {
    const { hostname } = new URL(from);
    if (options.origins.some((origin) => hostname.indexOf(origin) > -1)) { // TODO: seq read
      res.setHeader('Access-Control-Allow-Origin', `${from}`);
      res.setHeader('Access-Control-Allow-Methods', this._server.allowedMethods.join(', '));
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

    if (req.httpVersion !== '1.1') {
      return respondError(res, http400);
    }

    req.body = null;

    const explodedUrl = url.parse(req.url, true);
    req.path = explodedUrl.pathname;
    req.query = explodedUrl.query;

    Object.assign(params, {
      at: Date.now(),
      trackingId: uuid(),
    });

    if (req.headers['x-forwarded-for']) {
      params.remoteAddress = req.headers['x-forwarded-for'];
    } else if (req.connection && req.connection.remoteAddress) {
      params.remoteAddress = req.connection.remoteAddress;
    }

    setCORSHeadersIfNeeded(params.req, params.res, this._options);

    if (req.method === 'OPTIONS') {
      return respondOk(res);
    }
    const { allowedMethods } = this._server;
    if (!allowedMethods.includes(req.method)) {
      res.setHeader('Allow', allowedMethods.join(', '));
      return respondError(res, http405());
    }

    return chain.next();
  }
}

module.exports = { VieroEntryFilter };
