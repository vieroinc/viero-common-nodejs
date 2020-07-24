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
const { VieroLog } = require('@viero/common/log');
const { VieroHTTPServerFilter } = require('./filter');

const log = new VieroLog('http/filters/router');

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
    path.split('/').slice(1).forEach((pathComponent, idx, array) => {
      let subMap = map[pathComponent];
      if (!subMap) {
        subMap = {};
        map[pathComponent] = subMap;
      }
      map = subMap;
      if (idx === array.length - 1) {
        // TODO: TRACE pre- and post-action
        map['/'] = (params) => Promise.resolve(cb(params)).then((result) => result);
      }
    });
  }

  run(params, chain) {
    super.run(params, chain);

    let { path } = params.req;
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    const pathComponents = path.split('/');
    params.req.pathParams = {};

    let map = this._registry[params.req.method] || {};
    while (true) {
      const pathElement = pathComponents.shift();
      if (undefined === pathElement) {
        const cb = map['/'];
        if (cb && typeof cb === 'function') {
          params.action = cb;
        }
        return chain.next();
      }
      if (map[pathElement]) {
        map = map[pathElement];
        continue;
      }
      const parametric = Object.keys(map).filter((it) => it.startsWith(':'));
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
      params.req.pathParams[parametric[0].slice(1)] = decodeURIComponent(pathElement);
    }
  }
}

module.exports = { VieroRouterFilter };
