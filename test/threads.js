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
const { VieroThreads } = require('../src/threads');

const script = path.resolve('./test/threads/echoNs.js');

describe('/parallel', () => {
  const pool5 = VieroThreads.createPool(script, { min: 5 });
  it('/parallel/5/allfound', () => {
    expect(pool5.size).to.equal(5);
  });
  const proms1 = [
    pool5.run({ value: '1', wait: 500 }),
    pool5.run({ value: '2', wait: 500 }),
  ];
  it('/parallel/5/3idles', () => {
    expect(pool5.idle).to.equal(3);
  });
  it('/parallel/5/12', () => {
    Promise.all(proms1)
      .then(() => Promise.all([
        pool5.run({ value: 'one', wait: 0 }),
        pool5.run({ value: 'two', wait: 0 }),
      ]))
      .then(([first, second]) => {
        expect(first).to.equal('one');
        expect(second).to.equal('two');
        VieroThreads.terminatePool(pool5);
      });
  });
  const pool2 = VieroThreads.createPool(script, { min: 2, max: 2 });
  it('/parallel/2/2', () => {
    expect(pool2.size).to.equal(2);
  });
  const proms2 = [
    pool2.run({ value: '1', wait: 500 }),
    pool2.run({ value: '2', wait: 500 }),
    pool2.run({ value: '3', wait: 500 }),
  ];
  it('/parallel/2/1enqueued', () => {
    expect(pool2.queued).to.equal(1);
  });
  it('/parallel/2/123', () => {
    Promise.all(proms2).then((res) => {
      expect(res[0]).to.equal('1');
      expect(res[1]).to.equal('2');
      expect(res[2]).to.equal('3');
      VieroThreads.terminatePool(pool2);
    });
  });
});
