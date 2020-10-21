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

const { parse } = require('url');
const { VieroError } = require('@viero/common/error');
const { VieroLog } = require('@viero/common/log');
const { VieroHTTPServerFilter } = require('./filter');

const log = new VieroLog('http/filters/router');

const PATH_ELEMENT_REGEX = new RegExp(/(?<current>^\/.*?)(?<remainder>[/?].*)?$/);

class VieroRouterFilter extends VieroHTTPServerFilter {
  constructor(server) {
    super(server);

    this._registry = {};
  }

  registerRoute(method, path, cb) {
    if (!method || !path || !cb) {
      throw new VieroError('/http/filters/registerRoute', 887375);
    }
    if (!path.startsWith('/')) {
      throw new VieroError('/http/filters/registerRoute', 887376);
    }
    const methodUpperCase = method.toUpperCase();
    this._server.allowMethod(methodUpperCase);
    if (!this._registry[methodUpperCase]) {
      this._registry[methodUpperCase] = {};
    }
    let map = this._registry[methodUpperCase];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (path === null) {
        break;
      }
      const match = path.match(PATH_ELEMENT_REGEX);
      const { current: pathElement, remainder } = match.groups;
      // eslint-disable-next-line no-param-reassign
      path = remainder || null;
      let subMap = map[pathElement];
      if (!subMap) {
        subMap = {};
        map[pathElement] = subMap;
      }
      map = subMap;
      if (path === null) {
        // TODO: TRACE pre- and post-action
        map.action = (params) => Promise.resolve(cb(params)).then((result) => result);
      }
    }
  }

  run(params, chain) {
    super.run(params, chain);

    const url = parse(params.req.url, true);
    // eslint-disable-next-line no-param-reassign
    params.req.pathParams = {};
    // eslint-disable-next-line no-param-reassign
    params.req.body = null;
    // eslint-disable-next-line no-param-reassign
    params.req.path = url.pathname;
    // eslint-disable-next-line no-param-reassign
    params.req.query = url.query;

    let { path } = url;
    let map = this._registry[params.req.method.toUpperCase()] || {};
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (path === null) {
        // TODO: check
        if (map.action && typeof map.action === 'function') {
          // eslint-disable-next-line no-param-reassign
          params.action = map.action;
        }
        return chain.next();
      }
      const match = path.match(PATH_ELEMENT_REGEX);
      if (!match) {
        return chain.next();
      }
      // eslint-disable-next-line prefer-const
      let { current: pathElement, remainder } = match.groups;
      if (map[pathElement]) {
        // TODO: check
        map = map[pathElement];
      } else {
        let parametric = Object.keys(map).filter((it) => it.startsWith('/:'));
        if (parametric.length < 1) {
          return chain.next();
        }
        if (parametric.length > 1) {
          if (log.isError()) {
            log.error(`Ambiguous paths registered: ${parametric.join(',')}, unable to route.`);
          }
          return chain.next();
        }
        map = map[parametric[0]];
        parametric = parametric[0].slice(2);

        if (parametric.endsWith('...')) {
          // eslint-disable-next-line no-param-reassign
          params.req.pathParams[parametric.slice(0, -3)] = path.slice(1);
          remainder = null;
        } else {
          // eslint-disable-next-line no-param-reassign
          params.req.pathParams[parametric] = decodeURIComponent(pathElement.slice(1));
        }
      }
      path = remainder || null;
    }
  }
}

module.exports = { VieroRouterFilter };
