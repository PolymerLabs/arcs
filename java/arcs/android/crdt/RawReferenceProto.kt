package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.storage.RawReference
import arcs.core.storage.StorageKeyManager

/** Constructs a [RawReference] from the given [RawReferenceProto]. */
fun RawReferenceProto.toRawReference() = RawReference(
  id = id,
  storageKey = StorageKeyManager.GLOBAL_INSTANCE.parse(storageKey),
  version = if (hasVersionMap()) fromProto(versionMap) else null,
  _creationTimestamp = creationTimestampMs,
  _expirationTimestamp = expirationTimestampMs,
  isHardReference = isHardReference
)

/** Serializes a [RawReference] to its proto form. */
fun RawReference.toProto(): RawReferenceProto {
  val proto = RawReferenceProto.newBuilder()
    .setId(id)
    .setStorageKey(storageKey.toString())
    .setCreationTimestampMs(creationTimestamp)
    .setExpirationTimestampMs(expirationTimestamp)
    .setIsHardReference(isHardReference)
  version?.let { proto.versionMap = it.toProto() }
  return proto.build()
}

/** Reads a [RawReference] out of a [Parcel]. */
fun Parcel.readRawReference(): RawReference? =
  readProto(RawReferenceProto.getDefaultInstance())?.toRawReference()
