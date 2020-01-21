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
  usage: number;
}

interface WorkerFactory {
  /** Creates a worker and an associating message channel. */
  create?: () => PoolEntry;
}

class PoolOptions {
  // Don't suspend workers but destroy them directly.
  // The option forbids resurrecting workers at all contexts; in other
  // words, the pool can be replenished only by spinning up new workers.
  nosuspend = false;
}

const enum PolicyState {
  NOT_DESIGNATED,
  STANDBY,
  PROCESSING,
}

/** Arcs Worker Pool Management */
export const workerPool = new (class {
  // Suspended (aka free) workers.
  readonly suspended: PoolEntry[] = [];
  // In-use workers (indexed by the port allocated for the main renderer).
  readonly inUse = new Map<MessagePort, PoolEntry>();
  // The additional boolean configurations are applied to the worker pool.
  readonly options = new PoolOptions();
  // Whether the worker pool management is ON.
  active = false;
  // Worker APIs
  factory: WorkerFactory = {};
  // A pool sizing policy can be reassigned via {@link SIZING_POLICY_PARAMETER}
  // only when the worker pool management is active.
  policy = policies.default;
  // Tracks policy state
  policyState = PolicyState.NOT_DESIGNATED;

  constructor() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has(USE_WORKER_POOL_PARAMETER)) {
        this.active = true;

        // Resolves supplied boolean options.
        (urlParams.get(USE_WORKER_POOL_PARAMETER) || '')
            .split(',')
            .filter(Boolean)
            .forEach(e => {
              if (e in this.options) {
                this.options[e] = true;
              }
            });

        // Designates the requested sizing policy if any to manage pool sizing.
        const p = urlParams.get(SIZING_POLICY_PARAMETER);
        if (p && policies[p]) {
          this.policy = policies[p];
        }
        this.policyState = PolicyState.STANDBY;
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
      this.inUse.set(channel.port2, {worker, channel, usage: 1} as PoolEntry);
    } else {
      // The path is for spawning workers ahead-of-time.
      this.suspended.push({worker, channel, usage: 0} as PoolEntry);
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
      entry.worker.terminate();
    }
  }

  /**
   * Suspends the worker associating with the given port.
   *
   * @param port the host port being used to talk to its associated worker
   */
  suspend(port: object) {
    // Don't resurrect workers at all but spawn new workers as possible.
    // The suspend should be treated exactly as a destroy.
    if (this.options.nosuspend) {
      this.destroy(port);
      return;
    }
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
      // Assigns a new message channel to avoid wrong messages being passed to
      // this worker unexpectedly i.e. [#4475 unregister zombie handle listeners]
      // {@link https://github.com/PolymerLabs/arcs/issues/4475}
      //
      // {@link PoolEntry#usage} counts how many times this worker is reused.
      // Thus a zero value represents this worker was just spun up ahead of time.
      if (entry.usage > 0) {
        entry.channel = new MessageChannel();
      }

      // Keeps tracking this worker's usage and stats.
      entry.usage++;

      this.inUse.set(entry.channel.port2, entry);
    }
    return entry;
  }

  /** Cleans up all managed workers. */
  clear() {
    this.inUse.forEach(entry => {
      entry.worker.terminate();
    });
    this.inUse.clear();

    this.suspended.forEach(entry => {
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
  shrinkOrGrow(demand: number = POOL_SIZE_DEMAND) {
    setTimeout(async () => {
      // Only allows single executor at a time.
      if (this.policyState !== PolicyState.STANDBY) {
        return;
      }
      this.policyState = PolicyState.PROCESSING;

      // The actual shrink/grow process can be hanged up to the end of event
      // loop to yield more computing resources with higher parallelism to other
      // Arcs runtime/shell routines via relaxed 'await <reason>' calls.
      await 'relax_in_general';

      let numShrinkOrGrow = this.policy.arbitrate({
        demand: POOL_SIZE_DEMAND,
        free: this.suspended.length,
        inUse: this.inUse.size,
      });

      if (numShrinkOrGrow > 0 && !!this.factory.create) {
        // Grows the number of free workers by numShrinkOrGrow
        for (; numShrinkOrGrow > 0; numShrinkOrGrow--) {
          const {worker, channel} = this.factory.create();
          this.emplace(worker, channel, /*toInUse=*/false);
          await 'relax_growth';
        }
      } else if (numShrinkOrGrow < 0) {
        // Shrinks the number of free workers by numShrinkOrGrow
        for (; numShrinkOrGrow < 0; numShrinkOrGrow++) {
          if (this.suspended.length === 0) {
            // There are no spare free workers to terminate.
            break;
          }
          const {worker, channel} = this.suspended.pop();
          worker.terminate();
          await 'relax_shrink';
        }
      }

      this.policyState = PolicyState.STANDBY;
    }, 100);
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
