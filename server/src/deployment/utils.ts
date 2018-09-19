/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const ARCS_KEY_PREFIX = 'arcs-key-';

/**
 * Constructs label to be used in Kubernetes deployments.
 * @param fingerprint
 */
export function arcsKeyFor(fingerprint: string):string {
   return ARCS_KEY_PREFIX + fingerprint;
}

export const ON_DISK_DB = "TARGET_DISK";
