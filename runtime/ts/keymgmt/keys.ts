
export interface Key {
    algorithm(): string;
    fingerprint(): PromiseLike<string>;
}

export interface PrivateKey extends Key {
}

export interface PublicKey extends Key {
}

export interface DeviceKey extends Key {
    privateKey(): PrivateKey;
    publicKey(): PublicKey;
}

export interface RecoveryKey extends DeviceKey {
}

export interface WrappedKey extends Key {
  rewrap(privKey:PrivateKey, cloudKey: PublicKey): PromiseLike<WrappedKey>;
  export(): string;
}

export interface SessionKey extends Key {
    isDisposed(): boolean;
    encrypt(buffer: ArrayBuffer): PromiseLike<ArrayBuffer>;
    decrypt(buffer: ArrayBuffer): PromiseLike<ArrayBuffer>;
    disposeToWrappedKeyUsing(pkey: PublicKey): PromiseLike<WrappedKey>;
}

