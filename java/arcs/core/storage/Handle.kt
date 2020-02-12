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

package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.VersionMap
import arcs.core.util.TaggedLog

/**
 * The [Callbacks] interface is a simple stand-in for the callbacks that a [Handle] might want to
 * use to signal information back to a subscriber (like a handle).
 */
interface Callbacks<Data : CrdtData, Op : CrdtOperationAtTime, T> {
    /**
     * [onUpdate] is called when a diff is received from storage, or from a handle. Handles can
     * be notified for their own writes.
     * This method is not called for every change! A model sync will call [onSync] instead.
     * Do not depend on seeing every update via this callback.
     */
    fun onUpdate(handle: Handle<Data, Op, T>, op: Op) = Unit

    /**
     * [onSync] is called when the proxy is synced from its backing [Store].
     */
    fun onSync(handle: Handle<Data, Op, T>) = Unit

    /**
     * [onDesync] is called when the proxy realizes it is out of sync with its backing [Store].
     */
    fun onDesync(handle: Handle<Data, Op, T>) = Unit
}

/**
 * Base implementation of Arcs handles on the runtime.
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
 * used by JVM/Android hosts.
 *
 * Implementations using this base are assumed to be based on a [CrdtModel] type. Concrete
 * subclasses should select a [CrdtData] and [CrdtOperation] type for the [Handle] when
 * implementing a concrete version of it, and expose only the consumer type [T].
 *
 * The base handle interface is at this layer to avoid circular dependencies.
 */
open class Handle<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    /** [name] is the unique name for this handle, used to track state in the [VersionMap]. */
    val name: String,
    val storageProxy: StorageProxy<Data, Op, T>,

    /** [callback] contains optional Handle-owner provided callbacks to add behavior. */
private val callback: Callbacks<Data, Op, T>? = null,

    /**
     * [canRead] is whether this handle reads data so proxy can decide whether to keep its crdt
     * up to date.
     */
    val canRead: Boolean = true,

    /**
     * [canWrite] is whether this handle is writable. This can be used to enforce additional runtime
     * checks.
     */
    val canWrite: Boolean = true
) {
    protected val log = TaggedLog { "Handle($name)" }

    /** Local copy of the [VersionMap] for the backing CRDT. */
    var versionMap = VersionMap()
        protected set

    /** Read value from the backing [StorageProxy], updating the internal clock copy. */
    protected suspend fun value(): T {
        log.debug { "Fetching value." }
        val particleView = storageProxy.getParticleView()
        this.versionMap = particleView.versionMap
        return particleView.value
    }

    /** Helper that subclasses can use to increment their version in the [VersionMap]. */
    protected fun VersionMap.increment() {
        this[name]++
    }

    /**
     * This should be called by the [StorageProxy] this [Handle] has been registered with,
     * after a model update has been cleanly applied to the [StorageProxy]'s local copy.
     */
    internal fun onUpdate(op: Op) {
        versionMap = op.clock.copy()
        callback?.onUpdate(this, op)
    }

    /**
     * This should be called by the [StorageProxy] this [Handle] has been registered with,
     * after a full sync has occurred.
     */
    internal fun onSync(versionMap: VersionMap) {
        this.versionMap = versionMap
        callback?.onSync(this)
    }

    /**
     * This should be called by the [StorageProxy] this [Handle] has been registered with,
     * when the [StorageProxy] has detected that its local model is out of sync.
     */
    internal fun onDesync() = callback?.onDesync(this)
}
