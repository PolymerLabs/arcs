package arcs.core.data

import arcs.core.storage.StorageKey

/**
 * This class represents a storage key in a compiled [Plan] with 'create' fate.
 */
class CreateableStorageKey(val nameFromManifest: String) : StorageKey("create") {
    override fun toKeyString() = nameFromManifest

    override fun childKeyWithComponent(component: String): StorageKey {
        throw UnsupportedOperationException("CreateableStorageKey is used as a placeholder only.")
    }
}
