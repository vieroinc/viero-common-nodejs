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

const { Pool } = require('./pool');

const pools = {};

class Parallel {
  /**
   * Non-reentrant, returns null if pool with the same name has already been created.
   * @param {*} name
   * @param {*} scriptPath
   * @param {*} options
   */
  static createPool(name, scriptPath, options) {
    if (pools[name]) {
      return null;
    }
    const pool = new Pool({
      min: 1, max: Number.MAX_SAFE_INTEGER, ...(options || {}), name, scriptPath,
    });
    pools[name] = pool;
    return pools[name];
  }

  static pool(name) {
    return pools[name];
  }
}

module.exports = { Parallel };
