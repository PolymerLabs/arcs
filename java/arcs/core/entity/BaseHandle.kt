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
package arcs.core.entity

import arcs.core.storage.StorageProxy
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import kotlinx.coroutines.CoroutineDispatcher

/** Base functionality common to all read/write singleton and collection handles. */
abstract class BaseHandle<T : Storable>(config: BaseHandleConfig) : Handle {
    override val name: String = config.name

    override val dispatcher: CoroutineDispatcher
        get() = storageProxy.dispatcher

    val spec: HandleSpec<out Entity> = config.spec

    protected var closed = false

    private val storageProxy = config.storageProxy
    private val dereferencerFactory = config.dereferencerFactory

    override suspend fun onReady(action: () -> Unit) = storageProxy.addOnReady(name, action)

    protected inline fun <T> checkPreconditions(block: () -> T): T {
        check(!closed) { "Handle $name is closed" }
        return block()
    }

    override suspend fun close() {
        closed = true
        storageProxy.removeCallbacksForName(name)
    }

    /**
     * Constructs a [Reference] to the given [entity].
     *
     * Subclasses should implement their own `createReference` method, which first ensures that the
     * entity is actually stored in the handle before calling this internal method.
     */
    @Suppress("UNCHECKED_CAST")
    protected fun <E : Entity> createReferenceInternal(entity: E): Reference<E> {
        val storageKey = requireNotNull(storageProxy.storageKey as? ReferenceModeStorageKey) {
            "ReferenceModeStorageKey required in order to create references."
        }
        return Reference(
            spec.entitySpec,
            arcs.core.storage.Reference(entity.serialize().id, storageKey.backingKey, null).also {
                it.dereferencer = dereferencerFactory.create(spec.entitySpec.SCHEMA)
            }
        ) as Reference<E>
    }

    /** Configuration object required when calling [BaseHandle]'s constructor. */
    abstract class BaseHandleConfig(
        /** Name of the [Handle], typically comes from a particle manifest. */
        val name: String,
        /** Description of the capabilities and other details about the [Handle]. */
        val spec: HandleSpec<out Entity>,
        /**
         * [StorageProxy] instance to use when listening for updates, fetching data, or issuing
         * changes.
         */
        val storageProxy: StorageProxy<*, *, *>,
        /**
         * Creates de-referencers to support hydrating references within entities.
         */
        val dereferencerFactory: EntityDereferencerFactory,
        /**
         * ID of the Owning-particle. Used as a namespace for listeners created by this handle on
         * the [StorageProxy].
         */
        val particleId: String
    )
}
