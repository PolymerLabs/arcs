package arcs

import kotlinx.wasm.jsinterop.* // ktlint-disable no-wildcard-imports

/**
 * These are the method declarations for calling in WasmParticle.js
 */

// FIXME: replace with native CPP malloc copy
@SymbolName("Konan_js_get_String_length")
external fun getStringLength(arena: Int, stringIndex: Int): Int

@SymbolName("Konan_js_get_String_at")
external fun getStringCharCodeAt(arena: Int, stringIndex: Int, index: Int): Char

@SymbolName("arcs_WasmParticle_setState")
external fun setExternalState(arena: Int, index: Int, statePtr: Int, stateLen: Int)

@SymbolName("arcs_WasmParticle_log")
external fun logExternal(arena: Int, index: Int, msgPtr: Int, msgLen: Int)

@SymbolName("arcs_WasmParticle_getState")
external fun getExternalState(arena: Int, index: Int): JsValue

@SymbolName("arcs_WasmParticle_updateVariable")
external fun updateVariableExternal(
    arena: Int,
    index: Int,
    propNamePtr: Int,
    propNameLen: Int,
    stateStrPtr: Int,
    stateStrLen: Int
)

@SymbolName("arcs_WasmParticle_getInstance")
external fun getWasmParticleInstance(resultArena: Int): Int

@SymbolName("arcs_WasmParticle_service")
external fun invokeService(
    objArena: Int,
    objIndex: Int,
    resultArena: Int,
    stringPtr: Int,
    strLen:
    Int
): Int

@SymbolName("arcs_WasmParticle_setEventHandler")
external fun setEventHandler(arena: Int, index: Int, handlerPtr: Int, handlerLen: Int, func: Int)

@SymbolName("knjs__Promise_then")
public external fun knjs__Promise_then(
    arena: Int,
    index: Int,
    lambdaIndex: Int,
    lambdaResultArena: Int,
    resultArena: Int
): Int

fun setEventHandler(obj: JsValue, property: String, lambda: KtFunction<Unit>) {
    val pointer = wrapFunction(lambda)
    setEventHandler(obj.arena, obj.index, stringPointer(property),
        stringLengthBytes(property), pointer)
}

fun WasmParticle.setEventHandler(property: String, lambda: KtFunction<Unit>) {
    setEventHandler(this, property, lambda)
}

open class Promise(arena: Int, index: Int) : JsValue(arena, index) {
    constructor(jsValue: JsValue) : this(jsValue.arena, jsValue.index)

    fun <Rlambda> then(lambda: KtFunction<Rlambda>): Promise {
        val lambdaIndex = wrapFunction<Rlambda>(lambda)
        val wasmRetVal = knjs__Promise_then(
            this.arena,
            this.index,
            lambdaIndex,
            ArenaManager.currentArena,
            ArenaManager.currentArena
        )
        return Promise(ArenaManager.currentArena, wasmRetVal)
    }
}

val JsValue.asPromise: Promise
    get() {
        return Promise(this.arena, this.index)
    }

// UGLY: fix using internal KString.cpp functions
val JsValue.asString: String
    get() {
        val len = getStringLength(this.arena, this.index)
        if (len > 0) {
            val chars: CharArray = CharArray(len)
            for (i in 0 until len) {
                chars.set(i, getStringCharCodeAt(this.arena, this.index, i))
            }
            return String(chars)
        }
        return ""
    }
