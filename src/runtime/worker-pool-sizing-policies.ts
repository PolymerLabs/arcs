/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// The interaction model between worker pool manager and sizing policies:
// The pool manager sends a wish of "demand" pool size to a policy, then the
// policy answers with an "approval" pool size after arbitration.

// Sizing policies could start arbitration only if the number of total
// workers is less than the cap or there is still free worker in the
// pool for shrinking; otherwise sizing policies skips arbitration at once.
const APPROVAL_SIZE_CAP = 16;

 /** Pool size state */
interface SizeState {
  demand?: number;
  free?: number;
  inUse?: number;
}

/** Sizing policy apis and helpers */
export abstract class SizingPolicy {
  /**
   * Shrinks or grows worker pool size by arbitrating the number of workers
   * to be spawned or terminated in accordance with the current state of worker
   * pool size.
   *
   * @param sizeState represents the current state of worker pool size
   *
   * @returns the number of workers to be changed. A positive number means
   * growing the pool whereas a negative number for shrinking the pool.
   *
   * Note: if the shrinking number is larger than the number of current free
   * workers, all free workers are terminated while the in-use workers remain
   * untouched.
   *
   */
  abstract arbitrate(sizeState: SizeState): number;

  /**
   * Determines whether to skip arbitration in accordance with the current
   * state of worker pool size.
   *
   * @param sizeState represents the current state of worker pool size
   * @returns true to skip arbitration; otherwise, return false
   */
  skip(sizeState: SizeState): boolean {
    const {demand, free, inUse} = sizeState;

    // Skips as there is no chance of shrinking.
    if ((free + inUse) >= APPROVAL_SIZE_CAP && free === 0) {
      // Hint: lots of workers breathing! Forgot to kill?!
      console.warn(`${inUse} workers. Any zombies?!`);
      return true;
    }
    return false;
  }

  /**
   * Caps an approval into an allowed range.
   *
   * @param approval the arbitrated approval
   * @returns a capped approval in an allowed range
   */
  cap(approval: number) {
    return Math.max(Math.min(approval, APPROVAL_SIZE_CAP), 0);
  }
}

/**
 * [Aggressive Policy]
 * It's eager to maintain a bigger pool with more free room if available.
 *
 * Algorithm:
 * approval = Min(
 *   1.5 * Max(max_historical_inUse, demand),
 *   APPROVAL_SIZE_CAP
 * );
 */
const aggressive = new (class extends SizingPolicy {
  maxInUse = 0;
  readonly scale = (n: number) => Math.floor(n * 3 / 2);

  arbitrate(sizeState: SizeState) {
    try {
      if (this.skip(sizeState)) {
        return 0;
      }
      const {demand, free, inUse} = sizeState;
      if (inUse > this.maxInUse) {
        this.maxInUse = inUse;
      }
      const total = free + inUse;
      const approval = this.cap(this.scale(Math.max(this.maxInUse, demand)));
      return approval - total;
    } catch {
      return 0;
    }
  }
})();

/**
 * [Conservative Policy]
 * It's passive to just fulfill requested demand of pool size.
 *
 * Algorithm:
 * approval = Min(demand, APPROVAL_SIZE_CAP);
 */
const conservative = new (class extends SizingPolicy {
  arbitrate(sizeState: SizeState) {
    try {
      if (this.skip(sizeState)) {
        return 0;
      }
      const {demand: approval, free, inUse} = sizeState;
      return this.cap(approval) - free - inUse;
    } catch {
      return 0;
    }
  }
})();

/**
 * [Predictive Policy]
 * It forecasts target pool size via [Exponential Weighted Moving Average]
 * {@link https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average}
 *
 * Algorithm:
 * Let EWMA(t) := moving average pool size prediction at the time t
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
 * Algorithm:
 * approval = Min(Max(EWMA(t), demand), APPROVAL_SIZE_CAP);
 */
const predictive = new (class extends SizingPolicy {
  readonly weight = 1;
  ewma = 0;

  arbitrate(sizeState: SizeState) {
    try {
      if (this.skip(sizeState)) {
        return 0;
      }
      const {demand, free, inUse} = sizeState;
      const total = free + inUse;
      const diff = inUse - this.ewma;
      this.ewma = ((this.ewma << this.weight) + diff) >> this.weight;
      const approval = this.cap(Math.max(this.ewma, demand));
      return approval - total;
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
