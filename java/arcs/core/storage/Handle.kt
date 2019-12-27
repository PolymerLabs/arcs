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
import arcs.core.crdt.internal.VersionMap

/**
 * The [Callbacks] interface is a simple stand-in for the callbacks that a [Handle] might want to
 * use to signal information back to a subscriber (like a handle).
 */
interface Callbacks<Op : CrdtOperation> {
    /**
     * [onUpdate] is called when a diff is received from storage, or from a handle. Handles can
     * be notified for their own writes.
     * This method is not called for every change! A model sync will call [onSync] instead.
     * Do not depend on seeing every update via this callback.
     */
    fun onUpdate(op: Op)

    /**
     * [onSync] is called when the proxy is synced from its backing [Store].
     */
    fun onSync()

    /**
     * [onDesync] is called when the proxy realizes it is out of sync with its backing [Store].
     */
    fun onDesync()
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
open class Handle<Data : CrdtData, Op : CrdtOperation, T>(
    /** [name] is the unique name for this handle, used to track state in the [VersionMap]. */
    val name: String,
    val storageProxy: StorageProxy<Data, Op, T>,
    /**
     * [canRead] is whether this handle reads data so proxy can decide whether to keep its crdt
     * up to date
     */
    val canRead: Boolean = true
) {

    /** The currently registered [Callbacks] instance */
    var callback: Callbacks<Op>? = null

    /** Local copy of the [VersionMap] for the backing CRDT. */
    var versionMap = VersionMap()
        protected set

    /** Read value from the backing [StorageProxy], updating the internal clock copy. */
    suspend fun value(): T {
        val particleView = storageProxy.getParticleView()
        this.versionMap = particleView.versionMap
        return particleView.value
    }

    /** Helper that subclasses can use to increment their version in the [VersionMap]. */
    protected fun VersionMap.increment() {
        this[name]++
    }
}
