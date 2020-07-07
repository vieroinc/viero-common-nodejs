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

const log = new VieroLog('http/filters/router');

const registry = {};

const runAction = (action) => {
  return (params) => {
    // TODO: TRACE pre-action
    return Promise.resolve(action(params)).then(() => {
      // TODO: TRACE post-action
    });
  }
};

const registerRoute = (method, path, cb) => {
  if (!!!method || !!!path || !!!cb) {
    throw new VieroError('registerRoute', 887375);
  }
  if (!path.startsWith("/")) {
    throw new VieroError('registerRoute', 887376);
  }
  const methodUpperCase = method.toUpperCase();
  if (!registry[methodUpperCase]) {
    registry[methodUpperCase] = {};
  }
  let map = registry[methodUpperCase];
  path.split("/").slice(1).forEach((pathComponent, idx, array) => {
    let subMap = map[pathComponent];
    if (!subMap) {
      subMap = {};
      map[pathComponent] = subMap;
    }
    map = subMap;
    if (++idx === array.length) {
      map["/"] = runAction(cb);
    }
  });
};

const routerParserFilter = (params, chain) => {
  let _path = params.req.path;
  if (_path.startsWith('/')) {
    _path = _path.slice(1);
  }
  if (_path.endsWith("/")) {
    _path = _path.slice(0, -1);
  }
  const pathComponents = _path.split("/");
  params.pathParams = {};

  let map = registry[params.req.method];
  while (true) {
    const pathElement = pathComponents.shift();
    if (undefined === pathElement) {
      const cb = map["/"];
      if (cb && "function" === typeof cb) {
        params.action = cb;
      }
      return chain.next();
    }
    if (map[pathElement]) {
      map = map[pathElement];
      continue;
    }
    const parametric = Object.keys(map).filter((it) => it.startsWith(":"));
    if (parametric.length < 1) {
      return chain.next();
    }
    if (1 < parametric.length) {
      if (log.isError()) {
        log.error(`Ambiguous paths registered: ${parametric.join(',')}, unable to route.`);
      }
      return chain.next();
    }
    map = map[parametric[0]];
    params.pathParams[parametric[0].slice(1)] = decodeURIComponent(pathElement);
  }
};

const actionFilter = (params, chain) => {
  if (params.action) {
    return params.action(params);
  }
  chain.next();
};

const methods = () => Object.keys(registry);

module.exports = {
  registerRoute, routerParserFilter, actionFilter, methods,
};
