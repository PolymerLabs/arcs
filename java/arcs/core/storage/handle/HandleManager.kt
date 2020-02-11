package arcs.core.storage.handle

import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.storage.ActivationFactory
import arcs.core.storage.Callbacks
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey

typealias SingletonData<T> = CrdtSingleton.Data<T>
typealias SingletonOp<T> = CrdtSingleton.IOperation<T>
typealias SingletonStoreOptions<T> = StoreOptions<SingletonData<T>, SingletonOp<T>, T?>
typealias SingletonStore<T> = Store<SingletonData<T>, SingletonOp<T>, T?>
typealias SingletonHandle<T> = SingletonImpl<T>
typealias SingletonActivationFactory<T> = ActivationFactory<SingletonData<T>, SingletonOp<T>, T?>

typealias SetData<T> = CrdtSet.Data<T>
typealias SetOp<T> = CrdtSet.IOperation<T>
typealias SetStoreOptions<T> = StoreOptions<SetData<T>, SetOp<T>, Set<T>>
typealias SetStore<T> = Store<SetData<T>, SetOp<T>, Set<T>>
typealias SetHandle<T> = CollectionImpl<T>
typealias SetActivationFactory<T> = ActivationFactory<SetData<T>, SetOp<T>, Set<T>>

interface ActivationFactoryFactory {
    fun singletonFactory(): SingletonActivationFactory<RawEntity>
    fun setFactory(): SetActivationFactory<RawEntity>
}

/**
 * [HandleManager] is a convenience for creating handles using a provided store factory.
 *
 * Handles that are used by end-users will deal with [RawEntity], so this helper only bothers to
 * create those types.
 *
 * It will create a [StorageProxy] for each new storage key, and keep a reference to it for as
 * long as the [HandleFactory] exists.
 *
 * Instantiate it with the context and lifecycle that should own the resulting activate stores.
 */
class HandleManager(private val aff: ActivationFactoryFactory) {
    companion object {
        /**
         * Convenience for making a ramdisk-backed reference mode key
         */
        fun ramdiskStorageKeyForName(name: String) = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("$name-backing"),
            storageKey = RamDiskStorageKey("$name-storage")
        )
    }

    private val singletonProxies = mutableMapOf<StorageKey, SingletonProxy<RawEntity>>()
    private val setProxies = mutableMapOf<StorageKey, SetProxy<RawEntity>>()

    private val singletonStores = mutableMapOf<StorageKey, SingletonStore<RawEntity>>()
    private val setStores = mutableMapOf<StorageKey, SetStore<RawEntity>>()

    /**
     * Create a new SingletonHandle backed by an Android [ServiceStore]
     */
    suspend fun singletonHandle(
        storageKey: StorageKey,
        schema: Schema,
        callbacks: Callbacks<SingletonOp<RawEntity>>? = null
    ): SingletonHandle<RawEntity> {
        val storeOptions = SingletonStoreOptions<RawEntity>(
            storageKey = storageKey,
            existenceCriteria = ExistenceCriteria.MayExist,
            type = SingletonType(EntityType(schema)),
            mode = StorageMode.ReferenceMode
        )

        val store = singletonStores.getOrPut(storageKey) {
            Store(storeOptions)
        }

        val storageProxy = singletonProxies.getOrPut(storageKey) {
            SingletonProxy(store.activate(aff.singletonFactory()), CrdtSingleton())
        }

        return SingletonHandle(storageKey.toKeyString(), storageProxy).also {
            storageProxy.registerHandle(it)
            it.callback = callbacks
        }
    }

    /**
     * Create a new [SetHandle] backed by an Android [ServiceStore]
     */
    suspend fun setHandle(
        storageKey: StorageKey,
        schema: Schema,
        callbacks: Callbacks<SetOp<RawEntity>>? = null
    ): SetHandle<RawEntity> {
        val storeOptions = SetStoreOptions<RawEntity>(
            storageKey = storageKey,
            existenceCriteria = ExistenceCriteria.MayExist,
            type = CollectionType(EntityType(schema)),
            mode = StorageMode.ReferenceMode
        )

        val store = setStores.getOrPut(storageKey) {
            Store(storeOptions)
        }

        val storageProxy = setProxies.getOrPut(storageKey) {
            SetProxy(store.activate(aff.setFactory()), CrdtSet())
        }

        return SetHandle(storageKey.toKeyString(), storageProxy).also {
            storageProxy.registerHandle(it)
            it.callback = callbacks
        }
    }
}
