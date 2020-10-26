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

const { VieroHTTPServerFilter } = require('./filter');
const { respondError } = require('../respond.js');
const { http404 } = require('../error.js');

class VieroGiveUpFilter extends VieroHTTPServerFilter {
  run(params, chain) {
    super.run(params, chain);

    if (this.options) {
      if (this.options.mime) {
        return this.options.mime(params);
      }
      if (this.options.default) {
        return this.options.default(params);
      }
    }
    return respondError(params.res, http404());
  }
}

module.exports = { VieroGiveUpFilter };
