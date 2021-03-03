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

const http = require('http');

const { VieroError } = require('@viero/common/error');
const { VieroLog } = require('@viero/common/log');

const { VieroFilterChain } = require('./filterchain');
const { VieroEntryFilter } = require('./filter/entry');
const { VieroGiveUpFilter } = require('./filter/giveup');
const { VieroRouterFilter } = require('./filter/router');
const { VieroActionFilter } = require('./filter/action');

const log = new VieroLog('http');

class VieroHTTPServer {
  constructor() {
    this._entryFilter = new VieroEntryFilter(this);
    this._routerFilter = new VieroRouterFilter(this);
    this._actionFilter = new VieroActionFilter(this);
    this._giveUpFilter = new VieroGiveUpFilter(this);

    this._filters = [];
    this._allowedMethods = new Set(['OPTIONS']);

    this._server = http.createServer((req, res) => {
      new VieroFilterChain(req, res, [
        this._entryFilter, // init request
        this._routerFilter, // determines action
        ...this._filters, // static, body or any custom filters on demand
        this._actionFilter, // executes action
        this._giveUpFilter, // upon reached 404
      ]).next();
    });
  }

  get httpServer() {
    return this._server;
  }

  /**
   * Starts the server.
   */
  run({ host, port } = {}) {
    // eslint-disable-next-line no-param-reassign
    port = port || 80;
    // eslint-disable-next-line no-param-reassign
    host = host || '::';
    return new Promise((resolve, reject) => {
      this._server.on('error', (err) => reject(new VieroError('/http', 732561, { [VieroError.KEY.ERROR]: err })));
      this._server.listen(port, host, () => {
        if (log.isDebug()) {
          log.debug(`VieroHTTPServer server is listening on ${host}:${port}`);
        }
        return resolve();
      });
    });
  }

  /**
   * Stops the server.
   */
  stop() {
    return new Promise((resolve, reject) => {
      this._server.close((err) => {
        if (err) {
          return reject(new VieroError('/http', 732562, { [VieroError.KEY.ERROR]: err }));
        }
        if (log.isDebug()) {
          log.debug('VieroHTTPServer server is stopped listening.');
        }
        return resolve();
      });
    });
  }

  allowMethod(method) {
    this._allowedMethods.add(method);
  }

  get allowedMethods() {
    return [...this._allowedMethods];
  }

  /**
   * Cors options is like:
   *  {
   *    origins: <array of strings>
   *    headers: <array of header names>
   *    allowCredentials: <boolean>
   *  }
   * @param {*} options
   */
  setCORSOptions(options) {
    this._entryFilter.setup(options);
  }

  /**
   * Registers a filter.
   */
  registerFilter(filter, description) {
    this._filters.push(filter);
    if (log.isDebug()) {
      log.debug(`+ Filter: ${description}`);
    }
  }

  /**
   * Registers a route. See convenience methods for the most common methods.
   */
  registerRoute(method, path, cb, options) {
    // eslint-disable-next-line no-param-reassign
    options = options || {};
    this._routerFilter.registerRoute(method, path, cb, options.params);
    if (log.isDebug()) {
      const description = options.description ? ` // ${options.description}` : '';
      log.debug(`+ Route ${method.toUpperCase()}: ${path} ${description}`);
    }
  }

  /**
   * Registers 404 handlers.
   */
  registerFourOFour(options) {
    this._giveUpFilter.setup(options);
  }

  /**
   * Convenience method to declare a GET request.
   */
  get(path, cb, options) {
    return this.method('GET', path, cb, options);
  }

  /**
   * Convenience method to declare a HEAD request.
   */
  head(path, cb, options) {
    return this.method('HEAD', path, cb, options);
  }

  /**
  * Convenience method to declare a POST request.
  */
  post(path, cb, options) {
    return this.method('POST', path, cb, options);
  }

  /**
  * Convenience method to declare a PUT request.
  */
  put(path, cb, options) {
    return this.method('PUT', path, cb, options);
  }

  /**
  * Convenience method to declare a DELETE request.
  */
  delete(path, cb, options) {
    return this.method('DELETE', path, cb, options);
  }

  /**
   * Convenience method to declare a request with the specified method.
   */
  method(method, path, cb, options) {
    return this.registerRoute(method, path, cb, options);
  }

  /**
   * Convenience method to declare methods grouped by the same path.
   */
  route(path) {
    return {
      get: (cb, options) => this.get(path, cb, options),
      head: (cb, options) => this.head(path, cb, options),
      post: (cb, options) => this.post(path, cb, options),
      put: (cb, options) => this.put(path, cb, options),
      delete: (cb, options) => this.delete(path, cb, options),
      method: (method, cb, options) => this.method(method, path, cb, options),
    };
  }
}

module.exports = { VieroHTTPServer };
