/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// Enables the worker pool management via this url parameter.
const URL_PARAMETER = 'use-worker-pool';

// Keeps the pool size at least at this watermark.
const MIN_SIZE_OF_POOL = 5;

interface PoolEntry {
  worker: Worker;
  channel: MessageChannel;
}

/** Arcs Worker Pool Management */
export const workerPool = new (class {
  // Suspended (aka free) workers.
  readonly suspended: PoolEntry[] = [];
  // In-use workers (indexed by the port allocated for the main renderer).
  readonly inUse = new Map<MessagePort, PoolEntry>();
  // Whether the worker pool management is ON.
  active = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has(URL_PARAMETER)) {
        this.active = true;
      }
    }
  }

  exist(port: object): boolean {
    return this.active && !!this.inUse.get(port as MessagePort);
  }

  emplace(worker: Worker, channel: MessageChannel, toInUse: boolean = true) {
    if (toInUse) {
      // The path is for resurrecting workers spun up by the PEC factory.
      this.inUse.set(channel.port2, {worker, channel} as PoolEntry);
    } else {
      // The path is for spawning workers ahead-of-time.
      this.suspended.push({worker, channel} as PoolEntry);
    }
  }

  destroy(port: object) {
    const entry = this.inUse.get(port as MessagePort);
    if (entry) {
      this.inUse.delete(port as MessagePort);
      entry.worker.terminate();
    }
  }

  suspend(port: object) {
    const entry = this.inUse.get(port as MessagePort);
    if (entry) {
      this.inUse.delete(port as MessagePort);
      this.suspended.push(entry);
    }
  }

  resume(): PoolEntry | undefined {
    const entry = this.suspended.pop();
    if (entry) {
      this.inUse.set(entry.channel.port2, entry);
    }
    return entry;
  }

  async shrinkOrGrow(minSize: number = MIN_SIZE_OF_POOL) {
    // Yields cpu resources politely and passively.
    await 0;

    // TODO(ianchang):
    // shrink or grow number of workers to ${minSize} at least.
    // This provides the capabilities (included but not limited to):
    // a) Prepare workers in advance at the initialization path.
    // b) Shrink number of workers under memory pressure.
    // c) Grow number of workers to accommodate more outstanding Arcs.
  }
})();
