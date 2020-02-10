package arcs.android.util

import android.os.Parcel
import com.google.protobuf.CodedOutputStream
import com.google.protobuf.MessageLite

/** Writes the given [proto] to the [Parcel] as bytes. */
fun Parcel.writeProto(proto: MessageLite?) {
    if (proto == null) {
        writeInt(NULL_MARKER)
        return
    }
    val bytes = ByteArray(proto.serializedSize)
    proto.writeTo(CodedOutputStream.newInstance(bytes))
    writeInt(bytes.size)
    writeByteArray(bytes)
}

/**
 * Reads a proto of the given type from the [Parcel].
 *
 * @param defaultInstance the default instance of the proto to read
 *
 * Usage:
 *
 * ```kotlin
 * val proto: MyProto? = myParcel.readProto(MyProto.getDefaultInstance())
 * ```
 */
@Suppress("UNCHECKED_CAST")
fun <T : MessageLite> Parcel.readProto(defaultInstance: T): T? {
    val size = readInt()
    if (size == NULL_MARKER) return null
    val bytes = ByteArray(size)
    readByteArray(bytes)
    return defaultInstance.toBuilder().mergeFrom(bytes).build() as T
}

/** Non-nullable version of [readProto]. */
fun <T : MessageLite> Parcel.requireProto(defaultInstance: T, lazyMessage: () -> Any): T =
    requireNotNull(readProto(defaultInstance), lazyMessage)

/** Special marker used to indicate a null proto was stored. */
private const val NULL_MARKER = -1
