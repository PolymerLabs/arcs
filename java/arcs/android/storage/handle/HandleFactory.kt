package arcs.android.storage.handle

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.crdt.ParcelableCrdtType
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.storage.Callbacks
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.handle.CollectionImpl
import arcs.core.storage.handle.SingletonImpl
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlinx.coroutines.Dispatchers
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

typealias SingletonData<T> = CrdtSingleton.Data<T>
typealias SingletonOp<T> = CrdtSingleton.IOperation<T>
typealias SetData<T> = CrdtSet.Data<T>
typealias SetOp<T> = CrdtSet.IOperation<T>

typealias SingletonHandle<T> = SingletonImpl<T>
typealias SetHandle<T> = CollectionImpl<T>
typealias SingletonProxy<T> = StorageProxy<SingletonData<T>, SingletonOp<T>, T?>
typealias SetProxy<T> = StorageProxy<SetData<T>, SetOp<T>, Set<T>>
typealias SingletonStoreOptions<T> = StoreOptions<SingletonData<T>, SingletonOp<T>, T?>
typealias SetStoreOptions<T> = StoreOptions<SetData<T>, SetOp<T>, Set<T>>
@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
typealias SingletonStoreFactory<T> = ServiceStoreFactory<SingletonData<T>, SingletonOp<T>, T?>
@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
typealias SetStoreFactory<T> = ServiceStoreFactory<SetData<T>, SetOp<T>, Set<T>>

/**
 * HandleFactory is a convenience for creating handles that communicate with an Android service
 * store outside of a full Arcs ecosystem.
 *
 * Handles that are used by end-users will deal with [RawEntity], so this helper only bothers to
 * create those types.
 *
 * Instantiate it with the context and lifecycle that should own the resulting activate stores.
*/
@UseExperimental(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class HandleFactory(
   private val context: Context,
   private val lifecycle: Lifecycle,
   private val coroutineContext: CoroutineContext = EmptyCoroutineContext,
   private val connectionFactory: ConnectionFactory? = null
) {

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

        val serviceStoreFactory = SingletonStoreFactory<RawEntity>(
            context,
            lifecycle,
            ParcelableCrdtType.Singleton,
            coroutineContext + Dispatchers.IO,
            connectionFactory
        )

        val storageProxy = singletonProxies.getOrElse(storageKey) {
            SingletonProxy(Store(storeOptions).activate(serviceStoreFactory), CrdtSingleton())
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

        val serviceStoreFactory = SetStoreFactory<RawEntity>(
            context,
            lifecycle,
            ParcelableCrdtType.Set,
            coroutineContext + Dispatchers.IO,
            connectionFactory
        )

        val storageProxy = setProxies.getOrElse(storageKey) {
            SetProxy(Store(storeOptions).activate(serviceStoreFactory), CrdtSet())
        }

        return SetHandle(storageKey.toKeyString(), storageProxy).also {
            storageProxy.registerHandle(it)
            it.callback = callbacks
        }
    }
}
