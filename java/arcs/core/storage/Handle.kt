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

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.Ttl
import arcs.core.util.TaggedLog
import arcs.core.util.Time

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

    /** [ttl] applied to the data in the [Handle]. */
    val ttl: Ttl,

    /**  [time] contains platform appropriate time related implementation. */
    val time: Time,

    /**
     * [Dereferencer] to assign to any [Reference]s which are given as return values from
     * [value].
     */
    private val dereferencer: Dereferencer<RawEntity>? = null
) {
    protected val log = TaggedLog { "Handle($name)" }

    /** Add an action to be performed whenever the contents of the [Handle]'s data changes. */
    suspend fun addOnUpdate(action: (value: T) -> Unit) {
        storageProxy.addOnUpdate(name, action)
    }

    /** Add an action to be performed whenever the [Handle] becomes synchronized. */
    suspend fun addOnSync(action: () -> Unit) { storageProxy.addOnSync(name, action) }

    /** Add an action to be performed whenever the [Handle] becomes de-synchronized. */
    suspend fun addOnDesync(action: () -> Unit) { storageProxy.addOnDesync(name, action) }

    /**
     * Remove any `onUpdate`, `onSync`, or `onDesync` callbacks that this [Handle] has registered
     * with its [StorageProxy].
     */
    suspend fun removeAllCallbacks() {
        storageProxy.removeCallbacksForName(name)
    }

    /** Creates a [Reference] for a given [Referencable] and backing [StorageKey]. */
    fun createReference(referencable: Referencable, backingKey: StorageKey): Reference {
        return Reference(referencable.id, backingKey, null).also {
            it.dereferencer = dereferencer
        }
    }

    /** Return the local copy of the [VersionMap] for the storage proxy CRDT. */
    protected suspend fun versionMap() = storageProxy.getVersionMap()

    /** Read value from the backing [StorageProxy]. */
    protected suspend fun value(): T {
        log.debug { "Fetching value." }
        return storageProxy.getParticleView().injectDereferencer()
    }

    /** Helper that subclasses can use to increment their version in a [VersionMap]. */
    protected fun VersionMap.increment(): VersionMap {
        this[name]++
        return this
    }

    /**
     * Recursively inject the [Dereferencer] into any [Reference]s in the receiving object.
     */
    @Suppress("UNCHECKED_CAST")
    private fun <T> T.injectDereferencer(): T {
        when (this) {
            is Reference -> this.dereferencer = this@Handle.dereferencer
            is RawEntity -> {
                singletons.values.forEach { it.injectDereferencer() }
                collections.values.forEach { it.injectDereferencer() }
            }
            is Set<*> -> this.forEach { it.injectDereferencer() }
        }
        return this
    }
}
