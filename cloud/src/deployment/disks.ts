/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


/**
 * Represents a persistent disk volume in the cloud provider's infrastructure that is
 * capable of being attached to VMs (Nodes).
 */
export interface Disk {
    id(): string;
    type(): string;
    isAttached(): PromiseLike<boolean>;
    mount(rewrappedKey: string, node: string):PromiseLike<boolean>;
    dismount():PromiseLike<boolean>;
    wrappedKeyFor(fingerprint:string): PromiseLike<string>;
    delete(): PromiseLike<void>;
}

export interface DiskManager {
    /**
     * Find an existing disk (attached or unattached)
     * @param fingerprint the fingerprint of the wrapped key given to the server by the client when created.
     */
    find(fingerprint:string):PromiseLike<Disk|null>;

    /**
     * Create a new encrypted disk, given a wrapped key and a rewrapped key.
     * @param wrappedKey session key encrypted with device key
     * @param rewrappedKey session key reencrypted with cloud public key
     */
    create(fingerprint:string, wrappedKey: string, rewrappedKey: string):PromiseLike<Disk>;

    /**
     * Delete an unattached disk that has *never* been attached and is pristine.
     * @param param the Disk object to be deleted.
     */
    delete(param: Disk): Promise<void>;
}
