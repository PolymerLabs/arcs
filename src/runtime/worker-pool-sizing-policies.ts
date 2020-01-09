/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

 /** Pool size state */
interface SizeState {
  target?: number;
  free?: number;
  inUse?: number;
}

/** Sizing Policy APIs */
interface SizingPolicy {
  /**
   * Shrinks or grows worker pool size by arbitrating the number of workers
   * to be spawned or terminated in accordance with the current state of worker
   * pool size.
   *
   * @param sizeState represents the current state of worker pool siz
   *
   * @returns the number of workers to be changed. A positive number means
   * growing the pool whereas a negative number for shrinking the pool.
   *
   * Note: if the shrinking number is larger than the number of current free
   * workers, all free workers are terminated while the in-use workers remain
   * untouched.
   *
   */
  arbitrate(sizeState: SizeState): number;
}

/**
 * [Aggressive Policy]
 * It's eager to maintain a bigger pool with more free room if available.
 *
 * Algorithm:
 * Demand = 1.5 * Max(max_inUse_size_in_history, target_size)
 */
const aggressive = new (class implements SizingPolicy {
  maxInUse = 0;
  readonly scale = (n: number) => Math.floor(n * 3 / 2);

  arbitrate(sizeState: SizeState) {
    const {target, free, inUse} = sizeState;
    try {
      if (inUse > this.maxInUse) {
        this.maxInUse = inUse;
      }
      const total = free + inUse;
      const demand = this.scale(Math.max(this.maxInUse, target));
      return demand - total;
    } catch {
      return 0;
    }
  }
})();

/**
 * [Conservative Policy]
 * It's passive to fulfill the minimum requirement of pool size.
 *
 * Algorithm:
 * Demand = target_size
 */
const conservative = new (class implements SizingPolicy {
  arbitrate(sizeState: SizeState) {
    const {target, free, inUse} = sizeState;
    try {
      const total = free + inUse;
      const demand = target;
      return demand - total;
    } catch {
      return 0;
    }
  }
})();

/**
 * [Predictive Policy]
 * It forecasts the demand of pool size by [Exponential Weighted Moving Average]
 * {@link https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average}
 *
 * Algorithm:
 * Let EWMA(t) := moving average pool size demand at the time t
 * Let I := the number of current in-use workers
 * Let w := weight shift bits
 * Let c := coefficient = 1 / (1 << w)
 * Let DIFF(t) := the difference at time t = I - EWMA(t-1)
 *
 * EWMA(t)
 *   = c * (I) + (1 - c) * EWMA(t-1)
 *   = c * (I - EWMA(t-1)) + EWMA(t-1)
 *   = c * DIFF(t) + EWMA(t-1)
 *   = c * (EWMA(t-1) / c + DIFF(t))
 *   = 1 / (1 << w) * (EWMA(t - 1) * (1 << w) + DIFF(t))
 *   = ((EWMA(t - 1) << w) + DIFF(t)) >> w
 *
 * Demand = Max(EWMA(t), target_size)
 */
const predictive = new (class implements SizingPolicy {
  readonly weight = 1;
  ewma = 0;

  arbitrate(sizeState: SizeState) {
    const {target, free, inUse} = sizeState;
    try {
      const total = free + inUse;
      const diff = inUse - this.ewma;
      this.ewma = ((this.ewma << this.weight) + diff) >> this.weight;
      const demand = Math.max(this.ewma, target);
      return demand - total;
    } catch {
      return 0;
    }
  }
})();

/** All available pool sizing policies to be determined at run-time. */
export const policies = {
  aggressive,
  conservative,
  predictive,
};
