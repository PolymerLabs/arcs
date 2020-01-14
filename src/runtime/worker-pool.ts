/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {policies} from './worker-pool-sizing-policies.js';

// Enables the worker pool management via this url parameter.
// The value of parameter represents boolean options applied to a worker pool.
// Options are separated by comma.
const USE_WORKER_POOL_PARAMETER = 'use-worker-pool';
// Chooses worker pool sizing policy via this url parameter.
// @see {@link policies} for all available sizing policies.
const SIZING_POLICY_PARAMETER = 'sizing-policy';

// Wants to keep the pool size at least at this watermark.
const POOL_SIZE_DEMAND = 3;

interface PoolEntry {
  worker: Worker;
  channel: MessageChannel;
}

interface WorkerFactory {
  /** Creates a worker and an associating message channel. */
  create?: () => PoolEntry;
}

interface PoolOptions {
  nosuspend?: boolean;
}

/** Arcs Worker Pool Management */
export const workerPool = new (class {
  // Suspended (aka free) workers.
  readonly suspended: PoolEntry[] = [];
  // In-use workers (indexed by the port allocated for the main renderer).
  readonly inUse = new Map<MessagePort, PoolEntry>();
  // Whether the worker pool management is ON.
  active = false;
  // Additional options applied to the worker pool.
  options: PoolOptions = {};
  // Worker APIs
  factory: WorkerFactory = {};

  constructor() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has(USE_WORKER_POOL_PARAMETER)) {
        this.active = true;

        // Resolves supplied boolean options.
        const options =
            (urlParams.get(USE_WORKER_POOL_PARAMETER) || '')
                .split(',')
                .filter(Boolean);
        for (const option of options) {
          this.options[option] = true;
        }
      }
    }
  }

  /**
   * Checks if a worker associating with the host port is in-use.
   *
   * @param port the host port being used to talk to its associated worker
   */
  exist(port: object): boolean {
    return this.active && !!this.inUse.get(port as MessagePort);
  }

  /**
   * Emplaces a new worker and its messaging channel into the target collection.
   *
   * @param worker the new spun-up worker
   * @param channel the new established channel associating with the worker
   * @param toInUse where to emplace worker/channel to. If this parameter is
   *                true, the worker/channel is emplaced into a hash map
   *                collecting all in-use workers for the time being and being
   *                indexed by the host port; else the worker/channel is emplaced
   *                emplaced into an array representing all suspended (aka free)
   *                workers waiting for being resumed to serve new PECs.
   */
  emplace(worker: Worker, channel: MessageChannel, toInUse: boolean = true) {
    if (toInUse) {
      // The path is for resurrecting workers spun up by the PEC factory.
      this.inUse.set(channel.port2, {worker, channel} as PoolEntry);
    } else {
      // The path is for spawning workers ahead-of-time.
      this.suspended.push({worker, channel} as PoolEntry);
    }
  }

  /**
   * Closes a host port and destroys the worker associating with it.
   *
   * @param port the host port being used to talk to its associated worker
   */
  destroy(port: object) {
    const entry = this.inUse.get(port as MessagePort);
    if (entry) {
      this.inUse.delete(port as MessagePort);
      entry.channel.port2.close();
      entry.worker.terminate();
    }
  }

  /**
   * Suspends the worker associating with the given port.
   *
   * @param port the host port being used to talk to its associated worker
   */
  suspend(port: object) {
    const entry = this.inUse.get(port as MessagePort);
    if (entry) {
      this.inUse.delete(port as MessagePort);
      this.suspended.push(entry);
    }
  }

  /**
   * Resumes a worker from the suspended list if there is any.
   *
   * @return a PoolEntry specifying a resumed worker and its messaging channel
   */
  resume(): PoolEntry | undefined {
    const entry = this.suspended.pop();
    if (entry) {
      this.inUse.set(entry.channel.port2, entry);
    }
    return entry;
  }

  /** Cleans up (destroy & close) all managed workers and their channels. */
  clear() {
    this.inUse.forEach(entry => {
      entry.channel.port2.close();
      entry.worker.terminate();
    });
    this.inUse.clear();

    this.suspended.forEach(entry => {
      entry.channel.port2.close();
      entry.worker.terminate();
    });
    this.suspended.length = 0;
  }

  /**
   * Shrinks or grows the worker pool on demand.
   *
   * @param demand a demand that wishes to keep the worker pool size
   *               at least at this value.
   */
  async shrinkOrGrow(demand: number = POOL_SIZE_DEMAND) {
    // Yields cpu resources politely and aggressively.
    await 0;

    // TODO(ianchang):
    // shrink or grow number of workers per sizing policy arbitration result.
    // This provides the capabilities (included but not limited to):
    // a) Prepare workers in advance at the initialization path.
    // b) Shrink number of workers under memory pressure.
    // c) Grow number of workers to accommodate more outstanding Arcs.
  }

  /**
   * Delegates worker APIs.
   *
   * This allows delegations of single or multiple APIs to the internal
   * worker factory.
   *
   * Note:
   * If one API has already existed, it would be overwritten.
   */
  set apis(f: WorkerFactory) {
    // tslint:disable-next-line:forin
    for (const m in f) {
      this.factory[m] = f[m];
    }
  }
})();
