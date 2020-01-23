package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.internal.VersionMap


/**
 * The [Callbacks] interface is a simple stand-in for the callbacks that a [Handle] might want
 * to use* to signal information back to the runtime.
 *
 * This is mostly a place-holder at the moment.
 */
interface Callbacks {
    fun onUpdate(handle: Handle<*,*,*>)
}

/**
 * Base implementation of Arcs handles on the JVM runtime.
 *
 * A handle is in charge of translating SDK data operations into the appropriate CRDT operation,
 * and then forwarding them to a [StorageProxy].
 *
 * This handle implementation is different from the [Handle] hierarchy defined in [arcs.sdk]. This
 * handle knows about CRDTs and how to interface with storage. Eventually, the SDK-side [Handle]
 * instances will map to an instance based on this class in the runtime (similar to the current
 * strategy for wasm, in which Kotlin-wasm particles map to an instance of a storageNG handle
 * in the JS/TS runtime).
 *
 * Note: A possible eventual goal is that this becomes the single runtime [Handle] implementation,
 * targetting any runtime platform that Kotlin targets. For the moment, though, this is just
 * used by JVM hosts.
 *
 * Implementations using this base are assumed to be based on a [CrdtModel] type. Concrete
 * subclasses should select a [CrdtData] and [CrdtOperation] type for the [Handle] when
 * implementing a concrete version of it, and expose only the consumer type [T].
 */
abstract class Handle<Data : CrdtData, Op : CrdtOperation, T>(
    val name: String,
    val storageProxy: StorageProxy<Data, Op, T>
) {

    /** A list of current registered [Callbacks] instances */
    private val callbacks = mutableListOf<Callbacks>()

    /** Local copy of the [VersionMap] for the backing CRDT. */
    var versionMap = VersionMap()
        protected set

    /** Add a new [Callback] to the list. */
    fun addCallbacks(callbacks: Callbacks) {
        this.callbacks.add(callbacks)
    }

    /** Notify all registered [Callbacks] instances that an update has occurred. */
    protected fun notifyListeners() {
        callbacks.forEach {
            it.onUpdate(this)
        }
    }

    /** Read value from the backing [StorageProxy], updating the internal clock copy. */
    protected val value: T
        get() = storageProxy.getParticleView().let { (value, versionMap) ->
            this.versionMap = versionMap
            value
        }

    /** Helper that subclasses can use to increment their version in the [VersionMap]. */
    protected fun VersionMap.increment() {
        this[name]++
    }
}
