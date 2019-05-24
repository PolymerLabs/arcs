/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
export const ARCS_KEY_PREFIX = 'arcs-key-';

/**
 * Used to tag which compute VM hosts the kubernetes pods holding NodeJS VMs,
 * and where disks will be attached.
 */
export const ARCS_NODE_LABEL = 'arcs-node';
export const DISK_MOUNT_PATH = '/personalcloud';
export const VM_URL_PREFIX = 'VM_URL_PREFIX';

/**
 * Constructs label to be used in Kubernetes deployments.
 * @param fingerprint
 */
export function arcsKeyFor(fingerprint: string):string {
   return ARCS_KEY_PREFIX + fingerprint;
}


/**
 * Helper to wait a certain number of times for a GCP operation to finish.
 * @param func an async function that performs a GCP operation and returns a Promise<T>
 * @param waitCond an async function that takes a T and returns true or false if the operation is completed.
 * @param retries how many times to execute waitCond before giving up.
 * @param maxTimeout maximum amount of timeouts allowed.
 * @return the result from executing func
 */
export async function waitForGcp<T>(func: () => PromiseLike<[T]>, waitCond:(result:T) => PromiseLike<boolean>,
                                    retries = 10, maxTimeout = 30000):Promise<T> {

  let waiting = true;
  const timeout = maxTimeout / retries;
  try {
    const [result] = await Promise.race([func(), rejectAfter<[T]>(timeout)]);

    while (waiting && retries-- > 0) {
      try {
        // if the timeout finishes first, it will reject and skip this
        waiting = !await waitCond(result);
      } catch (e) {
        if (!(e instanceof Timeout)) {
          return Promise.reject(e);
        }
      }
      if (waiting) {
        await wait(timeout);
      }
    }
    if (waiting) {
      return Promise.reject(new Timeout());
    }
    // @ts-ignore
    return Promise.resolve(result);
  } catch (e) {
    return Promise.reject(e);
  }
}

async function wait(timeout: number) {
   try {
     await rejectAfter(timeout);
   } catch (e) {
     // ignored
   }
}

class Timeout extends Error {}

export async function rejectAfter<T>(duration: number):Promise<T> {
  return new Promise<T>((resolve, reject) => setTimeout(() => reject(new Timeout()), duration));
}

export const ON_DISK_DB = 'TARGET_DISK';
