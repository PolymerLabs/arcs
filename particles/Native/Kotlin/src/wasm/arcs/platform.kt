package arcs

import kotlin.coroutines.resume
import kotlin.reflect.KClass
import kotlin.reflect.KFunction0
import kotlinx.cinterop.uncheckedCast
import kotlinx.coroutines.* // ktlint-disable no-wildcard-imports
import kotlinx.serialization.KSerializer
import kotlinx.wasm.jsinterop.* // ktlint-disable no-wildcard-imports

/**
 * Implementations of Platform APIs for WASM. Note, some of these duplicate the JS versions.
 * Investigate extracting some of these back into common/platform.kt without expect keywords.
 */
actual object Platform {
    @Retain
    actual fun <T : UiParticle> installParticle(
        particle: KClass<T>,
        particleConstructor: KFunction0<T>
    ) {
        val particleInstance = particleConstructor.invoke()
        particleInstance.hookUpWasmParticle()
    }

    actual fun <T> async(block: suspend () -> T): Any {
        return runBlocking { block() }!!
    }
}

actual interface PromiseLike<T> {
    actual fun then(result: (T) -> Unit)
}

actual interface Event<T> {
    actual val data: EventData<T>
}

actual interface EventData<T> {
    actual val value: T
}

open class WasmParticle(arena: Int, index: Int) : JsValue(arena, index) {
    constructor(jsValue: JsValue) : this(jsValue.arena, jsValue.index)
}

val wasmParticleInstance: WasmParticle
    get() {
        val wasmRetVal = getWasmParticleInstance(ArenaManager.currentArena)
        return WasmParticle(ArenaManager.currentArena, wasmRetVal)
    }

actual abstract class UiParticle {

    /**
     * Setup callback functions on WasmParticle to invoke our Wasm methods, because callbacks define
     * arena scope, and thus temporary args are freed when the lambda finishes.
     */
    fun hookUpWasmParticle() {
        wasmParticle.setter("wasmRender") { args: ArrayList<JsValue> ->
            wasmParticle.setter(
                "wasmReturnSlot",
                render(args[0].asString, args[1].asString).toString()
            )
        }

        wasmParticle.setter("wasmTemplate") {
            wasmParticle.setter("wasmReturnSlot", template)
        }
        DomParticleBase.log("Hookup WasmParticle Finished")
    }

    actual fun setState(state: Any) {
        setExternalState(
            wasmParticle.arena, wasmParticle.index, stringPointer(state.toString()),
            stringLengthBytes(state.toString())
        )
    }

    actual fun getState(): Any? {
        return getExternalState(wasmParticle.arena, wasmParticle.index).asString
    }

    actual open var template: String = ""

    actual open fun render(props: Any, state: Any): Any {
        return state
    }

    actual open fun <U, T> service(args: U): PromiseLike<T> {
        val promisePtr = invokeService(
            wasmParticle.arena, wasmParticle.index,
            ArenaManager.currentArena,
            stringPointer(args.toString()), stringLengthBytes(args.toString())
        )
        val promise = Promise(ArenaManager.currentArena, promisePtr)

        return object : PromiseLike<T> {
            override fun then(result: (T) -> Unit) {
                promise.then({ args: ArrayList<JsValue> ->
                    result(args[0].asString.uncheckedCast())
                }
            )
        }
    }
}

val wasmParticle: WasmParticle = wasmParticleInstance

actual constructor()

actual fun updateVariable(variableName: String, rawData: Any) {
    val rawStr = rawData.toString()
    updateVariableExternal(
        wasmParticle.arena, wasmParticle.index, stringPointer(variableName),
        stringLengthBytes(variableName), stringPointer(rawStr), stringLengthBytes(rawStr)
    )
}
}

actual open class DomParticleBase<Props, State> actual constructor(
    propsSerializer: KSerializer<Props>,
    stateSerializer: KSerializer<State>
) : UiParticle() {

    val propsStrategy = propsSerializer
    val stateStrategy = stateSerializer

    actual companion object {
        actual fun log(msg: String) {
            logExternal(
                wasmParticleInstance.arena, wasmParticleInstance.index,
                stringPointer(msg), stringLengthBytes(msg)
            )
        }

        actual fun html(template: String): String {
            return template
        }
    }

    actual suspend fun <U, V> serviceCall(
        serializer: KSerializer<U>,
        resultSerializer: KSerializer<V>,
        request: U
    ): V {
        return serviceCallAsync(serializer, resultSerializer, request).await()
    }

    actual fun <U, V> serviceCallAsync(
        serializer: KSerializer<U>,
        resultSerializer: KSerializer<V>,
        request: U
    ): PromiseLike<V> {
        val args = kotlinx.serialization.json.Json.stringify(
            serializer,
            request
        )
        val promise = this.service<String, String>(
            args
        )

        return object : PromiseLike<V> {
            override fun then(result: (V) -> Unit) {
                promise.then {
                    result(
                        kotlinx.serialization.json.Json.nonstrict.parse(
                            resultSerializer,
                            it
                        )
                    )
                }
            }
        }
    }

    actual fun mutateState(state: State) {
        setState(kotlinx.serialization.json.Json.stringify(stateStrategy, state))
    }

    actual fun fetchState(): State {
        return kotlinx.serialization.json.Json.nonstrict.parse(
            stateStrategy,
            getState().toString()
        )
    }

    actual open fun renderState(props: Props, state: State): State {
        return state
    }

    actual fun <U> eventHandler(
        eventName: String,
        serializer: KSerializer<U>,
        block: (U) -> Unit
    ) {
        wasmParticle.setEventHandler(eventName) { evt: ArrayList<JsValue> ->

            val jsonStr = evt.get(0).asString
            block(
                kotlinx.serialization.json.Json.nonstrict.parse(
                    serializer,
                    jsonStr
                )
            )
        }
    }

    actual fun eventHandler(
        eventName: String,
        block: (Event<Any>) -> Unit
    ) {
        wasmParticle.setEventHandler(eventName) { evt: ArrayList<JsValue> ->
            block(object : Event<Any> {
                override val data: EventData<Any> = object : EventData<Any> {
                    // hack, should just make a singleton for this purpose
                    override val value: Any = evt.get(0).asString
                }
            })
        }
    }

    /**
     * Updates a handle given its name with rawData.
     */
    actual fun <U> updateHandle(name: String, serializer: KSerializer<U>, rawData: U) {
        updateVariable(
            name,
            kotlinx.serialization.json.Json.nonstrict.stringify(serializer, rawData)
        )
    }

    /**
     * Updates a handle given its name with rawData.
     */
    actual fun onCreate() {
        log("boo")
    }
}

suspend fun <T> PromiseLike<T>.await(): T =
    kotlinx.coroutines.suspendCancellableCoroutine { cont: CancellableContinuation<T> ->
        this@await.then(
            result = { cont.resume(it) })
    }
