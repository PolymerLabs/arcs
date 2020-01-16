package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.internal.VersionMap


/** Callbacks is a simple stand-in for the callbacks that a Handle might want to use to signal
 * information back to the runtime
 *
 * This is mostly a place-holder at the moment
 */
interface Callbacks {
    fun onUpdate(handle: Handle<*,*,*>)
}

/**
 * Base implementation of Handles on the JVM runtime.
 *
 * A handle is in charge of translating SDK data operations into the appropriate CRDT operation,
 * and then forwarding them to a StorageProxy.
 *
 * This handle implementation is different from the Handle hierarchy defined in the SDK. This
 * handle knows about CRDTs and how to interface with storage. Eventually, the SDK-side Handle
 * will map to an instance based on this class in the runtime (similar to the current strategy
 * for wasm, in which Kotlin-wasm particles map to an instance of a storageNG handle in the
 * JS/TS runtime).
 *
 * Note: A possible eventual goal is that this becomes the single runtime Handle implementation,
 * targetting any runtime platform that Kotlin targets. For the moment, though, this is just
 * used by JVM hosts.
 *
 * Implementations using this base are assumed to be based on a [CrdtModel] type. Concrete
 * subclasses should select a [CrdtData] and [CrdtOperation] type for the HandleImpl when
 * extending it, and expose only the consumer type <T>.
 *
 */
abstract class Handle<Data : CrdtData, Op : CrdtOperation, T>(
    val name: String,
    val storageProxy: StorageProxy<Data, Op, T>
) {

    /** A list of current registered callbacks */
    private val callbacks = mutableListOf<Callbacks>()

    /** add a new callback to the list */
    fun addCallbacks(callbacks: Callbacks) {
        this.callbacks.add(callbacks)
    }

    /** helper to notify all listeners that an update has occurred */
    protected fun notifyListeners() {
        callbacks.forEach {
            it.onUpdate(this)
        }
    }

    /** Local copy of the version map for the backing CRDT */
    var versionMap = VersionMap()
        protected set

    /** Read value from the backing [StorageProxy], updating the internal clock copy */
    protected val value: T
        get() {
            val (value, versionMap) = storageProxy.getParticleView()
            this.versionMap = versionMap
            return value
        }

    /** Helper that subclasses can use to increment their version in the map*/
    protected fun VersionMap.increment() {
        this[name]++
    }
}
