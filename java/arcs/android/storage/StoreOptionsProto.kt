package arcs.android.storage

import arcs.android.util.decodeProto
import arcs.core.data.proto.decode
import arcs.core.data.proto.encode
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.StoreOptions
import com.google.protobuf.StringValue

/** Constructs a [StoreOptions] from the given [StoreOptionsProto]. */
fun StoreOptionsProto.decode(): StoreOptions {
  return StoreOptions(
    storageKey = StorageKeyParser.parse(storageKey),
    type = type.decode(),
    versionToken = if (hasVersionToken()) versionToken.value else null
  )
}

/** Serializes a [StoreOptions] to its proto form. */
fun StoreOptions.toProto(): StoreOptionsProto {
  val proto = StoreOptionsProto.newBuilder()
    .setStorageKey(storageKey.toString())
    .setType(type.encode())
  // Convert nullable String to StringValue.
  versionToken?.let { proto.setVersionToken(StringValue.of(it)) }
  return proto.build()
}

/** Decodes a [StoreOptions] from the [ByteArray]. */
fun ByteArray.decodeStoreOptions(): StoreOptions {
  return decodeProto(this, StoreOptionsProto.getDefaultInstance()).decode()
}
