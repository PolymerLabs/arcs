/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.wasm

import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime
import kotlinx.cinterop.ByteVar
import kotlinx.cinterop.CPointed
import kotlinx.cinterop.CPointer
import kotlinx.cinterop.NativePtr
import kotlinx.cinterop.toCPointer
import kotlinx.cinterop.toKStringFromUtf8
import kotlinx.cinterop.toLong

// Model WasmAddress as an Int
typealias WasmAddress = Address

// Wasm Strings are also Int heap pointers
typealias WasmString = Int

typealias WasmNullableString = Int

// Extension method to convert an Int into a Kotlin heap ptr
fun WasmAddress.toPtr(): NativePtr {
    return this.toLong().toCPointer<CPointed>()!!.rawValue
}

// Longs are only used for Kotlin-Native calls to ObjC/Desktop C targets
fun Long.toWasmAddress(): WasmAddress {
    return this.toInt()
}

// Convert a native Kotlin heap ptr to a WasmAddress
fun NativePtr.toWasmAddress(): WasmAddress {
    return this.toLong().toWasmAddress()
}

// Convert a WasmString pointer into a Kotlin String
fun WasmString.toKString(): String {
    return this.toLong().toCPointer<ByteVar>()!!.toKStringFromUtf8()
}

// Convert a WasmString pointer into a nullable Kotlin String
fun WasmNullableString.toNullableKString(): String? {
    return this.toLong().toCPointer<ByteVar>()?.toKStringFromUtf8()
}

/** Convert a nullable WasmString pointer into a possibly empty UTF8-encoded ByteArray */
fun WasmNullableString.toByteArray(): ByteArray {
    // TODO: find a way to view the wasm address as bytes without round-tripping through String
    return this.toNullableKString()?.encodeToByteArray() ?: ByteArray(0)
}

@SymbolName("Kotlin_Arrays_getByteArrayAddressOfElement")
external fun ByteArray.addressOfElement(index: Int): CPointer<ByteVar>

/** Convert a ByteArray into a WasmAddress */
fun ByteArray.toWasmAddress(): WasmAddress {
    return this.addressOfElement(0).toLong().toWasmAddress()
}

/** Convert a Kotlin String into a WasmAddress */
fun String.toWasmString(): WasmString {
    // Ugh, this isn't null terminated
    val array = this.encodeToByteArray()
    // So we have to make a copy to add a null
    val array2 = ByteArray(array.size + 1)
    array.copyInto(array2)
    array2[array.size] = 0.toByte()
    return array2.toWasmAddress()
}

/** Convert a Kotlin String to a WasmAddress, where `null` is a valid value. */
fun String?.toWasmNullableString(): WasmNullableString {
    return this?.let { it.toWasmString() } ?: 0
}

// these are exported methods in the C++ runtime
@SymbolName("Kotlin_interop_malloc")
private external fun kotlinMalloc(size: Long, align: Int): NativePtr

@SymbolName("Kotlin_interop_free")
private external fun kotlinFree(ptr: NativePtr)

@SymbolName("abort")
external fun abort()

// Re-export the native C++ runtime methods to JS as _malloc/_free
@Retain
@ExportForCppRuntime("_malloc")
fun _malloc(size: Int): WasmAddress {
    return kotlinMalloc(size.toLong(), 1).toWasmAddress()
}

@Retain
@ExportForCppRuntime("_free")
fun _free(ptr: WasmAddress) {
    return kotlinFree(ptr.toPtr())
}

// //////////////////////////////////////// //
//  Global exports for WasmParticle follow  //
// //////////////////////////////////////// //

@Retain
@ExportForCppRuntime("_connectHandle")
fun connectHandle(
    particlePtr: WasmAddress,
    handleName: WasmString,
    canRead: Boolean,
    canWrite: Boolean
): WasmAddress {
    return particlePtr
        .toObject<WasmParticleImpl>()
        ?.connectHandle(handleName.toKString(), canRead, canWrite)
        ?.toAddress() ?: 0
}

@Retain
@ExportForCppRuntime("_init")
fun init(particlePtr: WasmAddress) {
    particlePtr.toObject<WasmParticleImpl>()?.init()
}

@Retain
@ExportForCppRuntime("_syncHandle")
fun syncHandle(particlePtr: WasmAddress, handlePtr: WasmAddress, encoded: WasmNullableString) {
    val handle = handlePtr.toObject<WasmHandle>()
    handle?.let {
        it.sync(encoded.toByteArray())
        particlePtr.toObject<WasmParticleImpl>()?.sync(it)
    }
}

@Retain
@ExportForCppRuntime("_updateHandle")
fun updateHandle(
    particlePtr: WasmAddress,
    handlePtr: WasmAddress,
    encoded1Ptr: WasmNullableString,
    encoded2Ptr: WasmNullableString
) {
    val handle = handlePtr.toObject<WasmHandle>()
    handle?.let {
        it.update(encoded1Ptr.toByteArray(), encoded2Ptr.toByteArray())
        particlePtr.toObject<WasmParticleImpl>()?.onHandleUpdate(it)
    }
}

// @Retain
// @ExportForCppRuntime("_onCreate")
// fun onCreate(particlePtr: WasmAddress) = particlePtr.toObject<WasmParticleImpl>()?.onCreate()

@Retain
@ExportForCppRuntime("_fireEvent")
fun fireEvent(
    particlePtr: WasmAddress,
    slotNamePtr: WasmString,
    handlerNamePtr: WasmString,
    eventData: WasmString
) {
    particlePtr.toObject<WasmParticleImpl>()?.fireEvent(
        slotNamePtr.toKString(),
        handlerNamePtr.toKString(),
        StringDecoder.decodeDictionary(eventData.toByteArray())
    )
}

@Retain
@ExportForCppRuntime("_serviceResponse")
fun serviceResponse(
    particlePtr: WasmAddress,
    callPtr: WasmString,
    responsePtr: WasmString,
    tagPtr: WasmString
) {
    val dict = StringDecoder.decodeDictionary(responsePtr.toByteArray())
    particlePtr.toObject<WasmParticleImpl>()?.serviceResponse(
        callPtr.toKString(),
        dict,
        tagPtr.toKString()
    )
}

@Retain
@ExportForCppRuntime("_renderOutput")
fun renderOutput(particlePtr: WasmAddress) {
    particlePtr.toObject<WasmParticleImpl>()
        ?.renderOutput()
}

@SymbolName("_singletonSet")
external fun singletonSet(particlePtr: WasmAddress, handlePtr: WasmAddress, stringPtr: WasmString)

@SymbolName("_singletonClear")
external fun singletonClear(particlePtr: WasmAddress, handlePtr: WasmAddress)

@SymbolName("_collectionStore")
external fun collectionStore(
    particlePtr: WasmAddress,
    handlePtr: WasmAddress,
    stringPtr: WasmString
): WasmString

@SymbolName("_collectionRemove")
external fun collectionRemove(
    particlePtr: WasmAddress,
    handlePtr: WasmAddress,
    stringPtr: WasmString
)

@SymbolName("_collectionClear")
external fun collectionClear(particlePtr: WasmAddress, handlePtr: WasmAddress)

@SymbolName("_onRenderOutput")
external fun onRenderOutput(
    particlePtr: WasmAddress,
    templatePtr: WasmNullableString,
    modelPtr: WasmNullableString
)

@SymbolName("_serviceRequest")
external fun serviceRequest(
    particlePtr: WasmAddress,
    callPtr: WasmString,
    argsPtr: WasmString,
    tagPtr: WasmString
)

@SymbolName("_resolveUrl")
external fun resolveUrl(urlPtr: WasmString): WasmString

@SymbolName("write")
external fun write(msg: WasmString)

@SymbolName("flush")
external fun flush()

fun log(msg: String) {
    write(msg.toWasmString())
    flush()
}
