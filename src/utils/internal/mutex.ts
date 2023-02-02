/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * Running a Releaser releases the acquired mutex.
 */
export interface Releaser {
  (): void;
}

/**
 * A simmple Mutex to gate access to critical async code
 * sections that should not execute concurrently.
 *
 * Sample usage:
 *
 * ```
 *   class SampleClass {
 *     private readonly mutex = new Mutex();
 *
 *     async instantiate() {
 *       const release = await mutex.acquire();
 *       try {
 *         // Protected section with async execution.
 *       } finally {
 *         release();
 *       }
 *     }
 *   }
 */

export class Mutex {
  private next: Promise<void> = Promise.resolve();
  private depth = 0; // tracks the number of blocked executions on this lock.

  /**
   * @return true if the mutex is already acquired.
   */
  get locked(): boolean {
    return this.depth !== 0;
  }

  /**
   * Call acquire and await it to lock the critical section for the Mutex.
   *
   * @return A Releaser which resolves to a function which releases the Mutex.
   */
  async acquire(): Promise<Releaser> {

    let release: Releaser;

    const current: Promise<Releaser> = this.next.then(() => {
      // external code is awaiting the result of acquire
      this.depth++;

      return () => {
        // external code is calling the releaser
        release();
        this.depth--;
      };
    });

    this.next = new Promise<void>(resolve => {
      release = resolve;
    });
    return current;
  }
}
