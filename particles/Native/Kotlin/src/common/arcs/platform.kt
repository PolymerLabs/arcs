package arcs

import kotlin.reflect.KClass
import kotlin.reflect.KFunction0
import kotlinx.serialization.KSerializer

/**
 * Base class for all Kotlin particles. Different implementations of this exist for JS, WASM, and JVM in
 * platform.kt files.
 */
expect abstract class UiParticle {
    // Normally overridden by Particle authors.
    open var template: String

    // Platform render function. Normally overridden by the platform
    // see renderState() for the public API
    open fun render(props: Any, state: Any): Any

    /**
     * Platform dependent UiParticle state manipulation. See mutateState for the public API.
     */
    fun setState(state: Any)
    fun getState(): Any?
    fun updateVariable(variableName: String, rawData: Any)

    /**
     * Platform dependent mechanism for executing service calls (e.g. UiParticle.service() call)
     */
    fun <U, T> service(args: U): PromiseLike<T>
    constructor()
}

/**
 * Cross platform Promise-like structure. Used by the logic to wireup coroutines to promises.
 */
expect interface PromiseLike<T> {
    fun then(result: (T) -> Unit)
}

/**
 * Provides in-scope static methods log and html for particles to use.
 */
expect open class DomParticleBase<Props, State> constructor(
    propsSerializer: KSerializer<Props>,
    stateSerializer: KSerializer<State>
) : UiParticle {

    companion object {
        fun log(msg: String)
        fun html(template: String): String
    }

    /**
     * Coroutine for executing service() call, serializing the request to appropriate wire format,
     * and deserializing the result.
     */
    suspend fun <U, V> serviceCall(
        serializer: KSerializer<U>,
        resultSerializer: KSerializer<V>,
        request: U
    ): V

    /**
     * Promise version of service call to support (workaround for current WASM
     * coroutines not re-entrant while runBlocking is called)
     */
    fun <U, V> serviceCallAsync(
        serializer: KSerializer<U>,
        resultSerializer: KSerializer<V>,
        request: U
    ): PromiseLike<V>

    /**
     * Gets the current state as a deserialized State class.
     */
    fun fetchState(): State

    /**
     * Mutates the current state with a deserialized State class.
     */
    fun mutateState(state: State)

    /**
     * Updates a handle given its name with rawData.
     */
    fun <U> updateHandle(name: String, serializer: KSerializer<U>, rawData: U)

    /**
     * Declares an event handler that deserializes wireformat event objects into data classes of type U.
     */
    fun <U> eventHandler(eventName: String, serializer: KSerializer<U>, block: (U) -> Unit)

    /**
     * Declares an event handler that passes raw Event object to handler.
     */
    fun eventHandler(eventName: String, block: (Event<Any>) -> Unit)

    /**
     * Should be overridden by particle developer.
     */
    open fun renderState(props: Props, state: State): State

    /**
     * Called when particle is created
     */
    open fun onCreate()
}

/**
 * All onFoo event handlers for Xen provide this as an example to the handler method.
 */
expect interface Event<T> {
    val data: EventData<T>
}

/**
 * The data attached to the event handler event message.
 */
expect interface EventData<T> {
    val value: T
}

/**
 * All platform specific utility functionality lives here.
 */
expect object Platform {
    /**
     * Expose a particle to the Arcs Runtime for initialization.
     */
    fun <T : UiParticle> installParticle(
        particle: KClass<T>,
        particleConstructor: KFunction0<T>
    )

    /**
     * Provides a context for executing a suspendable function.
     */
    fun <T> async(block: suspend () -> T): Any
}
