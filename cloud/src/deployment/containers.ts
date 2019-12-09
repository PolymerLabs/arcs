/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Disk} from './disks';

/**
 * Represents informations and operations related to deployed containers.
 */
export interface Container {
  /**
   * Cloud specific identifier (usually the underlying cluster VM.
   */
  node(): Promise<string>;

  /**
   * Return the storage volume currently attached to this container
   * (possibly unmounted).
   */
  disk(): Promise<Disk>;

  status(): DeploymentStatus;
  
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
  find(fingerprint: string): Promise<Container | null>;

  deploy(fingerprint: string, rewrappedKey: string, encryptedDisk: Disk): Promise<Container>;
}

/**
 * Current status of a container, such as running, pending, failed.
 */
export enum DeploymentStatus {
  /**
   * There is no container configured for this reference, possibly deleted.
   */
  NONEXISTENT,
  /**
   * Container is running (and attached), and ready to receive requests.
   */
  ATTACHED,
  /**
   * The Container is running, but it's disk is detached (or locked).
   */
  DETACHED,
  /**
   * Container in the process of becoming ready, such as after a reboot, or deploymeny.
   */
  PENDING,
  /**
   * Container currently in a failure state, such as insufficient cluster resources, or disks
   * not available.
   */
  FAILURE
}
