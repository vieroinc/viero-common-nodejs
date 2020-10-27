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
const https = require('https');
const { parseMime } = require('@viero/common/mime');

class VieroHTTPClient {
  /**
   *
   * @param {*} url a string
   * @param {*} options { timeout: <millis>, method: <string>, headers: <object>, body: <buffer> }
   */
  static request(url, options = {}) {
    return new Promise((resolve, reject) => {
      let dataPromise = null;
      let contentPromise = null;
      const cli = url.startsWith('https') ? https : http;
      const req = cli.request(url, options, (res) => {
        dataPromise = new Promise((dataResolve, dataReject) => {
          const buffers = [];
          res.on('data', (buffer) => buffers.push(buffer));
          res.on('end', () => dataResolve(Buffer.concat(buffers)));
          res.on('error', (err) => dataReject(err));
        });
        contentPromise = (header) => dataPromise.then((buffer) => {
          if (!header.headers['content-type']) {
            return buffer;
          }
          const mime = parseMime(header.headers['content-type']);
          switch (mime.essence) {
            case 'text/plain': return buffer.toString('utf8');
            case 'application/json': return JSON.parse(buffer.toString());
            default: return buffer;
          }
        });
      });
      req.on('response', (message) => {
        const header = (({
          headers, httpVersion, httpVersionMajor, httpVersionMinor, statusCode, statusMessage,
        }) => ({
          headers, httpVersion, httpVersionMajor, httpVersionMinor, statusCode, statusMessage,
        }))(message);
        resolve({ ...header, data: () => dataPromise, content: () => contentPromise(header) });
      });
      req.on('error', (err) => reject(err));
      if (options.body) req.write(options.body);
      req.end();
    });
  }
}

module.exports = { VieroHTTPClient };
