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

const path = require('path');
const { expect } = require('chai');
const { describe, it } = require('mocha');
const { Parallel } = require('../src/parallel');

describe('/parallel', () => {
  const script = path.resolve('./test/parallel/echo5s.js');
  const pool = Parallel.createPool('/parallel/min5', script, { min: 5 });
  it('/parallel/min5/allfound', () => {
    expect(pool.size === 5);
  });
  const proms = [
    pool.run(1),
    pool.run(2),
  ];
  it('/parallel/min5/3idles', () => {
    expect(pool.idle === 3);
  });
  pool.terminate();
  // Promise.all(proms).then(() => pool.terminate());
});
