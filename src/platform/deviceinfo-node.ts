/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import os from 'os';
// Provides access to device hardware resource metrics for a node process.
export class DeviceInfo {
  // Returns the number of logical cores.
  static hardwareConcurrency() {
    return os.cpus().length;
  }
  // Returns the device memory in gigabytes.
  static deviceMemory() {
    // Convert bytes to gigabytes.
    return os.totalmem() / Math.pow(1024, 3);
  }
}
