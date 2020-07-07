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

const { FilterChain } = require('./filterchain');
const { entryFilter } = require('./filters/entry');
const { giveUpFilter, registerGiveUp } = require('./filters/giveup');
const { routerParserFilter, actionFilter, registerRoute } = require('./filters/router');

const log = new VieroLog('http');
const filters = [];

class VieroHTTP {

  constructor() {
    this._server = http.createServer((req, res) => {
      new FilterChain(req, res, [
        entryFilter.bind(null, this._corsOptions),
        routerParserFilter,
        ...filters,
        actionFilter,
        giveUpFilter
      ]).next()
    });
    this._server.on('error', (err) => reject(new VieroError('/http', 732561, { [VieroError.KEY.ERROR]: err })));
  }

  get httpServer() {
    return this._server;
  }

  /**
   * Starts the server.
   */
  run({ host, port } = {}) {
    port = port || 80;
    host = host || '::';
    return new Promise((resolve, reject) => {
      this._server.listen(port, host, () => {
        if (log.isDebug()) {
          log.debug(`VieroHTTP server is listening on ${host}:${port}`);
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
          log.debug('VieroHTTP server is stopped listening.');
        }
        return resolve();
      });
    });
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
    this._corsOptions = options;
  }

  /**
   * Registers a filter.
   */
  registerFilter(filter, description) {
    filters.push(filter);
    if (log.isDebug()) {
      log.debug(`+ Filter: ${description}`);
    }
  }

  /**
   * Registers a route. See convenience methods for the most common methods.
   */
  registerRoute(method, path, cb, description) {
    registerRoute(method, path, cb);
    if (log.isDebug()) {
      log.debug(`+ Route ${method.toUpperCase() + "       ".substring(0, 7 - method.length)} - ${path}${!!description ? ` // ${description}` : ''}.`);
    }
  }

  /**
   * Registers a 404 handler.
   */
  registerFourOFour(mime, cb, description) {
    if (log.isDebug()) {
      log.debug(`+ 404 handler: ${description}`);
    }
    registerGiveUp(mime, cb);
  }

  /**
   * Convenience method to declare a GET.
   */
  get(path, cb, description) {
    return this.registerRoute('GET', path, cb, description);
  }

  /**
  * Convenience method to declare a POST.
  */
  post(path, cb, description) {
    return this.registerRoute('POST', path, cb, description);
  }

  /**
  * Convenience method to declare a PUT.
  */
  put(path, cb, description) {
    return this.registerRoute('PUT', path, cb, description);
  }

  /**
  * Convenience method to declare a DELETE.
  */
  delete(path, cb, description) {
    return this.registerRoute('DELETE', path, cb, description);
  }
}

module.exports = { VieroHTTP };
