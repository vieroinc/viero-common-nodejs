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

const { Worker } = require('worker_threads');

const findFreeWorker = (workers) => workers.find((aWorker) => !aWorker.busy);

const addWorker = (workers, options) => {
  if (workers.length < options.max) {
    const worker = { busy: false, native: new Worker(options.scriptPath) };
    workers.push(worker);
    return worker;
  }
  return null;
};

const addMinWorkers = (workers, options) => {
  if (workers.length < options.min) {
    const worker = addWorker(workers, options);
    if (worker) addMinWorkers(workers, options);
  }
};

const removeWorker = (workers, worker) => workers.splice(workers.indexOf(worker), 1);

class VieroThreadPool {
  constructor(options) {
    this._queue = [];
    this._workers = [];
    this._options = options;
    this._terminating = false;

    addMinWorkers(this._workers, this._options);
  }

  get queued() {
    return this._queue.length;
  }

  get idle() {
    return this._workers.filter((it) => !it.busy).length;
  }

  get size() {
    return this._workers.length;
  }

  get name() {
    return this._options.name;
  }

  run(data) {
    const worker = findFreeWorker(this._workers) || addWorker(this._workers, this._options);
    if (!worker) return new Promise((resolve) => this._queue.push(() => resolve().then(() => this.run(data))));
    return new Promise((resolve, reject) => {
      worker.busy = true;
      const onExit = () => (this._terminating ? undefined : addMinWorkers(this._workers, this._options));
      const onError = (err) => reject(err);
      const onMessage = (res) => resolve(res);
      worker.native.on('error', onError);
      worker.native.on('exit', onExit);
      worker.native.on('message', onMessage);
      worker.native.postMessage(data);
    })
      .then((res) => {
        worker.busy = false;
        const job = this._queue.shift();
        if (job) job();
        return res;
      })
      .catch((err) => {
        worker.busy = false;
        throw err;
      });
  }

  _terminate() {
    this._terminating = true;
    return Promise.all([...this._workers].reduce((acc, worker) => {
      acc.push(worker.native.terminate().then((res) => {
        removeWorker(this._workers, worker);
        return res;
      }));
      return acc;
    }, [])).then(() => undefined);
  }
}

module.exports = { VieroThreadPool };
