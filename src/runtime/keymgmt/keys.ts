/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export interface Fingerprintable {
    /** Returns a string representing a hash-like identifier of the key. Collisions are possible. */
    fingerprint(): PromiseLike<string>;
}

/**
 * The root interface of all Key types, allows discovering
 * the algorithm type it is used for.
 */
export interface Key {
    algorithm(): string;
}

/**
 * Designates the underlying key as containing private key material.
 */
export interface PrivateKey extends Key {
}

/**
 * Specifies the key contains public key material.
 */
export interface PublicKey extends Key, Fingerprintable {
}


/**
 * A DeviceKey represents each unique Arcs device with a public/private
 * keypair. Private keys are only used for unwrapping wrapped keys,
 * never leave the device, and their private key material must remain inaccessible to the
 * application.
 */
export interface DeviceKey extends Key, Fingerprintable {
    privateKey(): PrivateKey;
    publicKey(): PublicKey;
}

/**
 * A recovery key is a kind of device key that can be used to recover a DeviceKey
 * should it be lost.
 */
export interface RecoveryKey extends DeviceKey {
}

/**
 * Wrapped keys are session/storage keys, typically symmetric cipher keys, that are
 * stored or serialized using a DeviceKey's public key, or rewrapped with another public key.
 */
export interface WrappedKey extends Key, Fingerprintable {
    /**
     * Given a private key, and a public key, unwrap the session key, and rewrap it with
     * the public key. Then delete the old session from memory.
     * @param privKey
     * @param cloudKey
     */
  rewrap(privKey:PrivateKey, cloudKey: PublicKey): PromiseLike<WrappedKey>;
  unwrap(privKey:PrivateKey): PromiseLike<SessionKey>;
    /**
     * Export this session key in base64 string format.
     */
  export(): string;
}

export interface SessionKey extends Key {
    isDisposed(): boolean;

    /**
     * Given a public key, wrap the session key using the public key and delete the session key
     * material This method can only be invoked once per SessionKey instance.
     * @param pkey the PublicKey used for wrapping.
     */
    disposeToWrappedKeyUsing(pkey: PublicKey): PromiseLike<WrappedKey>;
}

