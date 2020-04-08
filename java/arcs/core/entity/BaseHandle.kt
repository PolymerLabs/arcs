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

/** Base functionality common to all read/write singleton and collection handles. */
abstract class BaseHandle<T : Storable>(
    override val name: String,
    val spec: HandleSpec<out Entity>,
    private val storageProxy: StorageProxy<*, *, *>,
    private val dereferencerFactory: EntityDereferencerFactory
) : Handle {
    protected var closed = false

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
}
