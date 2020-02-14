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
import arcs.core.util.guardedBy
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

typealias SingletonData<T> = CrdtSingleton.Data<T>
typealias SingletonOp<T> = CrdtSingleton.IOperation<T>
typealias SingletonStoreOptions<T> = StoreOptions<SingletonData<T>, SingletonOp<T>, T?>
typealias SingletonHandle<T> = SingletonImpl<T>
typealias SingletonActivationFactory<T> = ActivationFactory<SingletonData<T>, SingletonOp<T>, T?>

typealias SetData<T> = CrdtSet.Data<T>
typealias SetOp<T> = CrdtSet.IOperation<T>
typealias SetStoreOptions<T> = StoreOptions<SetData<T>, SetOp<T>, Set<T>>
typealias SetHandle<T> = CollectionImpl<T>
typealias SetActivationFactory<T> = ActivationFactory<SetData<T>, SetOp<T>, Set<T>>

/**
 * This interface is a convenience for creating the two common types of activation factories
 * that are used: singletons of [RawEntity] and sets of [RawEntity]
 *
 * An implementation of this interface can be provided to the constructor for [HandleFactory]
 */
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
 * It will create a [StorageProxy] for each new [StorageKey], and keep a reference to it for as
 * long as the [HandleManager] exists.
 *
 * If no arguments are passed, the default store ActivationFactory will be used. Optionally,
 * you can provide your own ActivationFactoryFactory, which provides methods for creating
 * activations factories to create singleton-rawentity and set-rawentity [ActiveStore]s
 */
class HandleManager(private val aff: ActivationFactoryFactory? = null) {
    private val singletonProxiesMutex = Mutex()
    private val singletonProxies by guardedBy(
        singletonProxiesMutex,
        mutableMapOf<StorageKey, SingletonProxy<RawEntity>>()
    )
    private val setProxiesMutex = Mutex()
    private val setProxies by guardedBy(
        setProxiesMutex,
        mutableMapOf<StorageKey, SetProxy<RawEntity>>()
    )

    /**
     * Create a new SingletonHandle backed by an Android [ServiceStore]
     *
     * The SingletonHandle will represent an Entity specified by the provided [Schema]
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

        val storageProxy = singletonProxiesMutex.withLock {
            singletonProxies.getOrPut(storageKey) {
                SingletonProxy(
                    Store(storeOptions).activate(aff?.singletonFactory()),
                    CrdtSingleton()
                )
            }
        }

        return SingletonHandle(storageKey.toKeyString(), storageProxy).also {
            storageProxy.registerHandle(it)
            it.callback = callbacks
        }
    }

    /**
     * Create a new [SetHandle] backed by an Android [ServiceStore]
     *
     * The SetHandle will represent an Entity specified by the provided [Schema]
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

        val storageProxy = setProxiesMutex.withLock {
            setProxies.getOrPut(storageKey) {
                SetProxy(Store(storeOptions).activate(aff?.setFactory()), CrdtSet())
            }
        }

        return SetHandle(storageKey.toKeyString(), storageProxy).also {
            storageProxy.registerHandle(it)
            it.callback = callbacks
        }
    }
}
