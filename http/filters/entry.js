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
  if (!corsOptions || !corsOptions.origins) {
    return;
  }
  const from = req.headers.origin || req.headers.referer;
  if (!from) {
    return;
  }

  try {
    const hostname = new URL(from).hostname;
    if (corsOptions.origins.some((origin) => -1 < origin.indexOf(hostname))) { // TODO: seq read
      res.setHeader("Access-Control-Allow-Origin", `${from}`);
      res.setHeader("Access-Control-Allow-Methods", ['OPTIONS', ...methods()].join(', '));
      if (corsOptions.headers) {
        res.setHeader("Access-Control-Allow-Headers", corsOptions.headers.join(", "));
      }
      if (corsOptions.allowCredentials) {
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
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

  setCORSHeadersIfNeeded(params.req, params.res, corsOptions);

  if ('OTIONS' === req.method) {
    return respondOk(res);
  }
  const registeredMethods = ['OPTIONS', ...methods()];
  if (!registeredMethods.includes(req.method)) {
    res.setHeader("Allow", registeredMethods.join(', '));
    return respondError(res, http405());
  }

  chain.next();
};

module.exports = {
  entryFilter,
};
