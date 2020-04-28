/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
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
fun <T : MessageLite> Parcel.readProto(defaultInstance: T): T? {
    val size = readInt()
    if (size == NULL_MARKER) return null
    val bytes = ByteArray(size)
    readByteArray(bytes)
    return decodeProto(bytes, defaultInstance)
}

/** Non-nullable version of [readProto], with a custom error message. */
fun <T : MessageLite> Parcel.requireProto(defaultInstance: T, lazyMessage: () -> Any): T =
    requireNotNull(readProto(defaultInstance), lazyMessage)

/** Non-nullable version of [readProto]. */
fun <T : MessageLite> Parcel.requireProto(defaultInstance: T): T =
    requireNotNull(readProto(defaultInstance)) {
        "${defaultInstance::class} not found in parcel."
    }

/**
 * Decodes a proto from the given [ByteArray]. A default instance of the proto must be supplied so
 * the correct type of proto can be decoded.
 */
@Suppress("UNCHECKED_CAST")
fun <T : MessageLite> decodeProto(bytes: ByteArray, defaultInstance: T): T {
    return defaultInstance.toBuilder().mergeFrom(bytes).build() as T
}

/** Special marker used to indicate a null proto was stored. */
private const val NULL_MARKER = -1
