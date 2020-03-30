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

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.RawEntity
import arcs.core.storage.StorageProxy
import arcs.core.storage.StoreOptions
import arcs.core.storage.referencemode.ReferenceModeStorageKey

typealias SingletonProxy<T> = StorageProxy<SingletonData<T>, SingletonOp<T>, T?>
typealias SingletonData<T> = CrdtSingleton.Data<T>
typealias SingletonOp<T> = CrdtSingleton.IOperation<T>
typealias SingletonStoreOptions<T> = StoreOptions<SingletonData<T>, SingletonOp<T>, T?>

/**
 * This class implements all of the methods that are needed by the various singleton [Handle]
 * interfaces:
 * * [Handle]
 * * [ReadableHandle<T>]
 * * [ReadSingletonHandle<T>]
 * * [WriteSingletonHandle<T>]
 * * [ReadWriteSingletonHandle<T>]
 *
 * It manages the storage and retrieval of items of the specified [Entity] type, including
 * their conversion to and from the backing [RawEntity] type that the storage layer requires.
 *
 * This class won't be returned directly; instead it will be wrapped in a facade object that
 * exposes only the methods that should be exposed.
 */
class SingletonHandle<T : HandleContent>(
    name: String,
    spec: HandleSpec<out Entity>,
    /** Interface to storage for [RawEntity] objects backing an `entity: T`. */
    val storageProxy: SingletonProxy<out Referencable>,
    /** Will ensure that necessary fields are present on the [RawEntity] before storage. */
    private val storageAdapter: StorageAdapter<T>,
    /** Provides logic to fetch [RawEntity] object backing a [Reference] field. */
    val dereferencerFactory: EntityDereferencerFactory
) : BaseHandle<T>(name, spec, storageProxy), ReadWriteSingletonHandle<T> {

    init {
        check(spec.containerType == HandleContainerType.Singleton)
    }

    // region implement ReadSingletonHandle<T>
    override suspend fun fetch() = checkPreconditions {
        adaptValue(storageProxy.getParticleView())
    }
    // endregion

    // region implement WriteSingletonHandle<T>
    override suspend fun store(entity: T) = checkPreconditions<Unit> {
        storageProxy.applyOp(
            CrdtSingleton.Operation.Update(
                name,
                storageProxy.getVersionMap().increment(name),
                storageAdapter.toStorage(entity)
            )
        )
    }

    override suspend fun clear() = checkPreconditions<Unit> {
        storageProxy.applyOp(
            CrdtSingleton.Operation.Clear(
                name,
                storageProxy.getVersionMap()
            )
        )
    }
    // endregion

    // region implement ReadableHandle<T>
    override suspend fun onUpdate(action: suspend (T?) -> Unit) =
        storageProxy.addOnUpdate(name) {
            action(adaptValue(it))
        }
    // endregion

    private fun adaptValue(value: Referencable?): T? = value?.let { storageAdapter.fromStorage(it) }
}
