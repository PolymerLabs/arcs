# Arcs Key Management System (AKMS)

This set of Typescript classes abstracts the necessary functions
for Arc's Authentication, Identity, and Persona concepts. The underlying
implementation may be backed by WebCrypto, Android native code, or
other platform specific classes.

<!--- TODO: Update this with consistent terminology
  DeviceKeys (KEK/Key Encrytion Key)
  CloudStorageKeys (Wrapped DEK/Decryption Key with KEK)
  UserKey (Stable key fingerpint across all devices)
  RecoveryKey
  PersonaKey (used to identify users in sharing)
-->
## Key Generation and Key Exchange

There are four types of keys managed by _AKMS_, Storage keys,
public/private *DeviceKey* pairs, public/private *PersonaKey* pairs,
and public/private *RecoveryKey* pairs.

Ordinarily, we would want to use ECDH, wherein two peers exchange public
keys and then derive a shared secret disk storage key. However, in the Arcs
model, the cloud instances can be emphemeral and lose their in-memory
storage session keys, meaning there would be no way for the client to 
supply the cloud node's private key without the client storing it.

Instead, we exchange AES-256 storage session keys via RSA-OAEP wrappers. 
In the case of GCP Compute Nodes, Google provides public keys available
at [https://cloud.google.com/compute/docs/disks/customer-supplied-encryption]

*TODO: RSA-OAEP may go away in the future. Consider supporting ECDH by 
having the device store the generated ECDH keypair from the cloud instance.
Reinitializing a cloud instance that lost its disk would then mean 
retransmitting its ECDH keys and re-deriving the session key. This 
effectively makes the device itself the KMS, as opposed to using something like
Google Cloud KMS.*

## Key Storage

Key internal bits are generally not exposed to the application 
(except wrapped keys and exported public keys), so key 
storage is fundamentally tied to the underlying native crypto library to 
reduce the probability of leakage of key material. For the Web, 
Key Storage can be implemented by IndexDB which has native capability
for storing opaque CryptoKeys, callbacks to native Android key stores, 
or by some future secure, replicated backup system.

# Usage

### Key Generation

#### Storage Session Keys

StorageKeys are used to mount encrypted storage on remote cloud 
nodes. They are currently AES-GCM keys transmitted as a shared secret. 
However, this may change in the future if *ECDH* is adopted, in which case, 
the SessionKey is actually an ECDH keypair of the Cloud node. 

StorageKeys contain sensitive material, and aren't exposed to
application code for manipulation, they are always wrapped, either by a
DeviceKey, or by a Cloud's public key (e.g. GCP PEM). In GCP's case,
it passes the GCP wrapped key directly to the disk subsystem and the
unwrapped key is never exposed.


```
import {KeyManager} from 'ts/keymgmt/manager.ts'

// Uses platform default (e.g. WebCrypto on Chrome)
const generator = KeyManager.getGenerator();
const key = await generator.generateWrappedStorageKey(publicKey);
```

#### Device Keys
```
import {KeyManager} from 'ts/keymgmt/manager.ts'

const generator = KeyManager.getGenerator();
const keyPair = await generator.generateDeviceKey();
```

### Recovery Key

Because recovery keys must be stored in a special key ring 
potentially outside of the location that Device Keys can be
stored, this method is responsible for creating the key, 
potentially stored in a special enclave.

```
import {KeyManager} from 'ts/keymgmt/manager.ts'

const generator = KeyManager.getGenerator();
const recoveryKey = await generator.generateAndStoreRecoveryKey();
```

### Save Key to Persistent Storage

Note, only DeviceKeys or WrappedKeys may be persisted. 

```
KeyManager.getStorage().write(deviceOrWrappedKey);
```

### Load Key from Persistent Storage

```
const sessionKey = await KeyManager.getStorage().find(keyFingerPrint);
```

### Unwrap a WrappedKey and rewrap for Cloud

```
import {KeyManager} from 'ts/keymgmt/manager.ts'

const deviceKey = KeyManager.getStorage().find(deviceKeyId);

// Cloud is asking us to unwrap this key
const wrappedKey = receiveFromCloud(cloudNode);

// Retrieve publically published GCP public key
const gcpCert = await generator.importKey(cloudNodeGcpKeyInPemFormat);
const gcpWrappedKey = wrappedKey.rewrap(deviceKey, gcpCert);
sendToCloud(cloudNode, gcpWrappedKey.export());
```
