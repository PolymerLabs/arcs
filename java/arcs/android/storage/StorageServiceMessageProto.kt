package arcs.android.storage

import arcs.android.util.decodeProto

/** Decodes a [StorageServiceMessageProto] from the [ByteArray]. */
fun ByteArray.decodeStorageServiceMessageProto(): StorageServiceMessageProto {
  return decodeProto(this, StorageServiceMessageProto.getDefaultInstance())
}
