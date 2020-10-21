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

const { expect } = require('chai');
const { describe, it } = require('mocha');
const { VieroRouterFilter } = require('../src/http/server/filter/router');

const server = { allowMethod() { } };
const method = 'custom';

const router = new VieroRouterFilter(server);

let result = null;

const replace = (path) => {
  const match = path.match(/(:.)/g);
  if (!match) {
    return path;
  }
  Array.from(match).forEach((pattern) => {
    // eslint-disable-next-line no-param-reassign
    path = path.replace(pattern, pattern.slice(1).toUpperCase());
  });
  return path;
};

const paths = [
  '/',
  '/a',
  '/a/b',
  '/a/:b',
  '/a/:b/c',
  '/a/:b/c/:d',
].map((path) => ({ original: path, mapped: replace(path) }));

paths.forEach((path) => router.registerRoute(method, path.original, (params) => {
  result = path.original;
  Object.entries(params.req.pathParams).forEach((entry) => {
    result = result.replace(`:${entry[0]}`, entry[1]);
  });
}));

const run = (path) => {
  const params = { req: { method, url: path }, action: () => { result = 'no match'; } };
  router.run(params, { next() { params.action(params); } });
};

describe('/http/server/filter/router', () => {
  paths.forEach((path) => {
    it(`/http/server/filter/router > ${path.original}`, () => {
      run(path.mapped);
      expect(result).to.equal(path.mapped);
    });
  });

  const path = {
    original: '/a/:b/c/:d/e/:f...',
    mapped: '/a/B/c/D/e/F/G/H/I?X=1',
  };
  router.registerRoute(method, path.original, (params) => {
    result = path.original;
    Object.entries(params.req.pathParams).forEach((entry) => {
      let candidate = result.replace(`:${entry[0]}...`, entry[1]);
      if (candidate === result) {
        candidate = result.replace(`:${entry[0]}`, entry[1]);
      }
      result = candidate;
    });
  });
  it(`/http/server/filter/router > ${path.original}`, () => {
    run(path.mapped);
    expect(result).to.equal(path.mapped);
  });
});
