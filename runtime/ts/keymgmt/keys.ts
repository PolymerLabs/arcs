
export interface Key {
}

export interface PrivateKey extends Key {
}

export interface PublicKey extends Key {
}

export interface WrappedKey<T extends Key> extends Key {
  unwrap(privKey:PrivateKey): T;
}

export interface SessionKey {
    exportWrappedForKey(pkey: PublicKey): string;
}

class SessionKeyImpl implements SessionKey {
    sessionKey: CryptoKey;

    constructor(sessionKey: CryptoKey) {
      this.sessionKey = sessionKey;
    }

    exportWrappedForKey(pkey: PublicKey): string {
        return "";
    }
}

export class KeyManager {
    generateSessionKey(): PromiseLike<SessionKey> {
      const generatedKey:PromiseLike<CryptoKey> = crypto.subtle.generateKey({name: 'AES-GCM', length: 256},
          true, ["encrypt", "decrypt"]);
      return generatedKey.then(key => new SessionKeyImpl(key));
    }
}