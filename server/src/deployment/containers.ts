/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Disk} from "./disks";

/**
 * Represents informations and operations related to deployed containers.
 */
export interface Container {
  /**
   * Return the storage volume currently attached to this container
   * (possibly unmounted).
   */
  disk(): PromiseLike<Disk>;

  /**
   * Return an externally accessible URL that maps to the running
   * node VM.
   */
  url(): string;
}

/**
 * Interface for finding and deploying containers.
 */
export interface ContainerManager {
  /**
   * Find an existing node vm instance running for this devicekey.
   * @param fingerprint the fingerprint of the wrapped session key (by the devicekey)
   */
  find(fingerprint: string): PromiseLike<Container | null>;

  deploy(fingerprint: string, encryptedDisk: Disk): PromiseLike<Container>;
}
