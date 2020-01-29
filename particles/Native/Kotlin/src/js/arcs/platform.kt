package arcs

import kotlin.coroutines.resume
import kotlin.js.* // ktlint-disable no-wildcard-imports
import kotlin.reflect.KClass
import kotlin.reflect.KFunction0
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async
import kotlinx.coroutines.await
import kotlinx.serialization.KSerializer

/**
 * Anything marked external in this file means the implementation lives in JS.
 */
actual object Platform {
    actual fun <T : UiParticle> installParticle(
        particle: KClass<T>,
        particleConstructor: KFunction0<T>
    ) {
        // Actually invokes defineParticle() in global JS scope
        defineParticle({ api -> inherit(particle.js, api.UiParticle, api) })
    }

    actual fun <T> async(block: suspend () -> T): Any {
        return GlobalScope.async { block() }
    }
}

/**
 * Represents JS versions of the event objects received.
 */
actual external interface Event<T> {
    actual val data: EventData<T>
}

actual external interface EventData<T> {
    actual val value: T
}

/**
 * Represents the callback arguments provided by defineParticle.
 */
external interface ParticleApi {
    val UiParticle: UiParticle
    fun html(text: String): String
    fun log(log: String)
}

/**
 * This class actually represents a pure baseclass, but extending it will cause DomParticleBase to
 * put it in its prototype chain. We don't want that, so we tell the Kotlin compiler that it's JS
 * name is "Object".
 */
@JsName("Object")
actual abstract external class UiParticle {
    actual fun setState(state: Any)
    actual fun getState(): Any?
    actual open var template: String
    actual open fun render(props: Any, state: Any): Any
    actual fun updateVariable(variableName: String, rawData: Any)

    actual constructor() {
        definedExternally
    }

    actual fun <U, T> service(args: U): PromiseLike<T>
}

actual external interface PromiseLike<T> {
    actual fun then(result: (T) -> Unit)
}

actual open class DomParticleBase<Props, State> actual constructor(
    propsSerializer: KSerializer<Props>,
    stateSerializer: KSerializer<State>
) : UiParticle() {

    val propsStrategy = propsSerializer
    val stateStrategy = stateSerializer

    /**
     * Delegate log() and html() methods to those provided by defineParticle
     */
    actual companion object {
        var api: ParticleApi? = null
        actual fun log(msg: String) {
            if (api != null) {
                return (api as ParticleApi).log(msg)
            }
        }

        actual fun html(template: String): String {
            if (api != null) {
                return (api as ParticleApi).html(template)
            }
            return template
        }
    }

    /**
     * For JS, this could be optimized to avoid all of the serialization and parsing, but leaving
     * this implementation for now since it validates the WASM/JVM version.
     */
    actual suspend fun <U, V> serviceCall(
        serializer: KSerializer<U>,
        resultSerializer: KSerializer<V>,
        request: U
    ): V {
        return serviceCallAsync(serializer, resultSerializer, request).await()
    }

    /**
     * Invokes JS UiParticle.service(), converts JS object to JSON, and then pipes it
     * through kotlinx.serialization to obtain typed data class objects, returned via promise.
     */
    actual fun <U, V> serviceCallAsync(
        serializer: KSerializer<U>,
        resultSerializer: KSerializer<V>,
        request: U
    ): PromiseLike<V> {
        val promise = (this.service<U, V>(
            JSON.parse(
                kotlinx.serialization.json.Json.stringify(
                    serializer,
                    request
                )
            )
        ) as Promise<V>)
        return object : PromiseLike<V> {
            override fun then(result: (V) -> Unit) {
                promise.then {
                    result(
                        kotlinx.serialization.json.Json.nonstrict.parse(
                            resultSerializer,
                            JSON.stringify(it)
                        )
                    )
                }
            }
        }
    }

    /**
     * Marshalls state object into JSON, and back into JS object format.
     */
    actual fun mutateState(state: State) {
        setState(JSON.parse(kotlinx.serialization.json.Json.stringify(stateStrategy, state)))
    }

    /**
     * Returns UiParticle.getState() as a typed State object.
     */
    actual fun fetchState(): State {
        return kotlinx.serialization.json.Json.nonstrict.parse(
            stateStrategy,
            JSON.stringify(getState())
        )
    }

    actual open fun renderState(props: Props, state: State): State {
        return state
    }

    /**
     * Converts the UiParticle.render() call into a typed call to renderState().
     */
    override fun render(props: Any, state: Any): Any {
        return JSON.parse(
            kotlinx.serialization.json.Json.stringify(
                stateStrategy, renderState(
                kotlinx.serialization.json.Json.nonstrict.parse(
                    propsStrategy,
                    JSON.stringify(props)
                ),
                kotlinx.serialization.json.Json.nonstrict.parse(
                    stateStrategy,
                    JSON.stringify(state)
                )
            )
            )
        )
    }

    /**
     * Registers event handlers on UiParticle parent with type marshalling.
     */
    actual fun <U> eventHandler(
        eventName: String,
        serializer: KSerializer<U>,
        block: (U) -> Unit
    ) {
        val prototype = Reflect.getPrototypeOf(this)
        prototype[eventName] = { evt: Event<Json> ->
            block(
                kotlinx.serialization.json.Json.nonstrict.parse(
                    serializer,
                    JSON.stringify(evt.data.value)
                )
            )
        }
    }

    /**
     * Registers an event handler on UiParticle with ignored event argument.
     */
    actual fun eventHandler(
        eventName: String,
        block: (Event<Any>) -> Unit
    ) {
        val prototype = Reflect.getPrototypeOf(this)
        prototype[eventName] = { evt: Event<Any> ->
            block(evt)
        }
    }

    /**
     * Updates a handle given its name with rawData.
     */
    actual fun <U> updateHandle(name: String, serializer: KSerializer<U>, rawData: U) {
        updateVariable(
            name,
            JSON.parse(kotlinx.serialization.json.Json.nonstrict.stringify(serializer, rawData))
        )
    }
}

// HERE BY DRAGONS

external fun defineParticle(callback: (ParticleApi) -> UiParticle)

external object Reflect {
    fun setPrototypeOf(a: dynamic, b: dynamic)
    fun getPrototypeOf(a: dynamic): dynamic
}

external interface PropertyDescriptor<T> {
    var configurable: Boolean
    var enumerable: Boolean
    var value: T
    var writable: Boolean
    var get: () -> T
    var set: (v: T) -> Unit
}

external object Object {
    fun <T> getOwnPropertyDescriptor(o: Any, p: String): PropertyDescriptor<T>
    fun <T, P> defineProperty(o: T, p: String, attributes: PropertyDescriptor<P>): T
}

external class Proxy(obj: dynamic, handler: dynamic)

/**
 * The purpose of this bizarre method is to reparent 'child' to extend 'parent.
 * Because KotlinJS outputs ES5, and Arcs runtime is ES6, you can't just extend an
 * ES6 super-class and have the super constructor chain work. Furthermore, Kotlin
 * constructors can't return values. What this code does is use a proxy constructor
 * to invoke the super ES6 class using Reflect.construct(), manually apply the
 * child ES5 constructor, and return the resulting object. Ugly, but it works.
 */
fun inherit(
    child: JsClass<out UiParticle>,
    parent: dynamic,
    api: ParticleApi
): UiParticle {
    var childProto = js("child.prototype")
    while (childProto != null &&
        childProto.constructor != null &&
        childProto.constructor != DomParticleBase::class.js) {
        childProto = Reflect.getPrototypeOf(childProto)
    }

    Reflect.setPrototypeOf(childProto, parent.prototype)
    Reflect.setPrototypeOf(childProto.constructor, parent)
    val descriptor: PropertyDescriptor<Proxy> =
        Object.getOwnPropertyDescriptor(js("child.prototype"), "constructor")
    val handler = js(
        """Object.create({
          construct: function(target, args) {
              child.prototype.constructor.spec = target.spec
              var obj = Reflect.construct(parent, args,  child.prototype.constructor);
              child.prototype.constructor.apply(obj, args);
              return obj;
          }
      });"""
    )

    val proxy = Proxy(child, handler)
    descriptor.value = proxy
    Object.defineProperty(child, "constructor", descriptor)
    val particle = proxy as UiParticle
    DomParticleBase.api = api
    return particle
}

suspend fun <T> PromiseLike<T>.await(): T =
    kotlinx.coroutines.suspendCancellableCoroutine { cont: CancellableContinuation<T> ->
        this@await.then(
            result = { DomParticleBase.log("Continuing"); cont.resume(it) })
    }
