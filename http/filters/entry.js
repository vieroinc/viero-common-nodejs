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

const { VieroUID } = require('@viero/common/uid');

const { http400, http405 } = require('../error');
const { respondError, respondOk } = require('../respond');
const { methods } = require('./router');

const setCORSHeadersIfNeeded = (req, res, corsOptions) => {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) {
    return;
  }

  try {
    const hostname = new URL(origin).hostname;
    if (corsOptions.origins.some((origin) => -1 < hostname.indexOf(origin))) { // TODO: seq read
      res.setHeader("Access-Control-Allow-Origin", `${origin}`);
      res.setHeader("Access-Control-Allow-Methods", ['OPTIONS', ...methods()].join(', '));
      res.setHeader("Access-Control-Allow-Headers", corsOptions.headers.join(", "));
      res.setHeader("Access-Control-Allow-Credentials", corsOptions.allowCredentials ? 'true' : 'false');
    }
  } catch (e) { }
};

const entryFilter = (corsOptions, params, chain) => {
  const { req, res } = params;

  if ("1.1" !== req.httpVersion) {
    return respondError(res, http400);
  }

  req.body = null;

  const explodedUrl = url.parse(req.url, true);
  req.path = explodedUrl.pathname;
  req.query = explodedUrl.query;

  Object.assign(params, {
    startTs: Date.now(),
    trackingId: VieroUID.uuid(),
  });

  if (req.headers["x-forwarded-for"]) {
    params.remoteAddress = req.headers["x-forwarded-for"];
  } else if (req.connection && req.connection.remoteAddress) {
    params.remoteAddress = req.connection.remoteAddress;
  }

  if (corsOptions) {
    setCORSHeadersIfNeeded(params.req, params.res, corsOptions);
  }

  if ('OTIONS' === req.method) {
    return respondOk(res);
  }
  const registeredMethods = methods();
  if (!registeredMethods.includes(req.method)) {
    res.setHeader("Allow", ['OPTIONS', ...registeredMethods].join(', '));
    return respondError(res, http405());
  }

  chain.next();
};

module.exports = {
  entryFilter,
};
