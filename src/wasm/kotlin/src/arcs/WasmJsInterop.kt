package arcs

import kotlinx.cinterop.*
import kotlin.native.internal.ExportForCppRuntime

// Model WasmAddress as an Int
typealias WasmAddress = Int

// Wasm Strings are also Int heap pointers
typealias WasmString = Int

/**
 * Any object implementing this interface can be converted into a (pinned) stable heap pointer.
 * To avoid GC Leaks, eventually the ABI should have a Particle.dispose() method which releases
 * these pinned pointers. Right now, the lifetime of these objects depends on the Arcs Runtime
 * holding onto particle and handle references beyond the scope of the call.
 */
abstract class WasmObject {
    private var cachedWasmAddress: WasmAddress? = null
    fun toWasmAddress(): WasmAddress {
        if (cachedWasmAddress == null) {
            cachedWasmAddress = StableRef.create(this).asCPointer().toLong().toWasmAddress()
        }
        return cachedWasmAddress as WasmAddress
    }
}

// Extension method to convert an Int into a Kotlin heap ptr
fun WasmAddress.toPtr(): NativePtr {
    return this.toLong().toCPointer<CPointed>().rawValue
}

// Convert a WasmAddress back into a Kotlin Object reference
inline fun <reified T : Any> WasmAddress.toObject(): T {
    return this.toLong().toCPointer<CPointed>()!!.asStableRef<T>().get()
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

@SymbolName("Kotlin_Arrays_getByteArrayAddressOfElement")
external fun ByteArray.addressOfElement(index: Int): CPointer<ByteVar>

// Convert a Kotlin String into a WasmAddress
fun String.toWasmString(): WasmString {
    // Ugh, this isn't null terminated
    val array = this.toUtf8()
    // So we have to make a copy to add a null
    val array2 = ByteArray(array.size + 1)
    array.copyInto(array2)
    array2[array.size] = 0.toByte()
    // When UTF16 is supported by CPP, we can remove all of this
    return array2.addressOfElement(0).toLong().toWasmAddress()
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

////////////////////////////////////////////
// Global exports for WasmParticle follow //
////////////////////////////////////////////


@Retain
@ExportForCppRuntime("_connectHandle")
fun connectHandle(particlePtr: WasmAddress, handleName: WasmString, willSync: Boolean):WasmAddress {
    log("Connect called")
    return particlePtr.toObject<Particle>().connectHandle(handleName.toKString(), willSync)!!.toWasmAddress()
}

@Retain
@ExportForCppRuntime("_init")
fun init(particlePtr: WasmAddress) {
  particlePtr.toObject<Particle>().init()
}


@Retain
@ExportForCppRuntime("_syncHandle")
fun syncHandle(particlePtr: WasmAddress, handlePtr: WasmAddress, encoded: WasmString) {
    log("Getting handle")
    val handle = handlePtr.toObject<Handle>()
    val encodedStr = encoded.toKString()
    log("Handle is " + handle.name + "syncing '" + encodedStr + "'")
    handle.sync(encodedStr)
    log("Invoking sync on handle on particle")
    particlePtr.toObject<Particle>().sync(handle)
}

@Retain
@ExportForCppRuntime("_updateHandle")
fun updateHandle(particlePtr: WasmAddress, handlePtr: WasmAddress, encoded1Ptr: WasmString,
                 encoded2Ptr: WasmString) {
    val handle = handlePtr.toObject<Handle>()
    handle.update(encoded1Ptr.toKString(), encoded2Ptr.toKString())
    particlePtr.toObject<Particle>().onHandleUpdate(handle)
}

@Retain
@ExportForCppRuntime("_renderSlot")
fun renderSlot(particlePtr: WasmAddress, slotNamePtr: WasmString, sendTemplate: Boolean, sendModel: Boolean) {
    particlePtr.toObject<Particle>()
        .renderSlot(slotNamePtr.toKString(), sendTemplate, sendModel)
}

@Retain
@ExportForCppRuntime("_fireEvent")
fun fireEvent(particlePtr: WasmAddress, slotNamePtr: WasmString, handlerNamePtr: WasmString) {
    particlePtr.toObject<Particle>().fireEvent(
        slotNamePtr.toKString(),
        handlerNamePtr.toKString()
    )
}

@Retain
@ExportForCppRuntime("_serviceResponse")
fun serviceResponse(particlePtr: WasmAddress, callPtr: WasmString, responsePtr: WasmString, tagPtr: WasmString) {
  val dict = StringDecoder.decodeDictionary(responsePtr.toKString())
  particlePtr.toObject<Particle>().serviceResponse(callPtr.toKString(), dict, tagPtr.toKString())

}

@Retain
@ExportForCppRuntime("_renderOutput")
fun renderOutput(particlePtr: WasmAddress) {
  particlePtr.toObject<Particle>()
    .renderOutput()
}

@SymbolName("_singletonSet")
external fun singletonSet(particlePtr: WasmAddress, handlePtr: WasmAddress, stringPtr: WasmString)

@SymbolName("_singletonClear")
external fun singletonClear(particlePtr: WasmAddress, handlePtr: WasmAddress)

@SymbolName("_collectionStore")
external fun collectionStore(particlePtr: WasmAddress, handlePtr: WasmAddress, stringPtr: WasmString)

@SymbolName("_collectionRemove")
external fun collectionRemove(particlePtr: WasmAddress, handlePtr: WasmAddress, stringPtr: WasmString)

@SymbolName("_collectionClear")
external fun collectionClear(particlePtr: WasmAddress, handlePtr: WasmAddress)

@SymbolName("_render")
external fun render(particlePtr: WasmAddress, slotNamePtr: WasmString, templatePtr: WasmString, modelPtr: WasmString)

@SymbolName("_onRenderOutput")
external fun onRenderOutput(particlePtr: WasmAddress, templatePtr: WasmString, modelPtr: WasmString)

@SymbolName("_serviceRequest")
external fun serviceRequest(particlePtr: WasmAddress, callPtr: WasmString, argsPtr: WasmString, tagPtr: WasmString)

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
