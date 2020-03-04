package arcs.core.storage.handle

import arcs.core.common.Refinement
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.storage.EntityActivationFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.Store
import arcs.core.util.Time
import arcs.core.util.guardedBy
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * This interface is a convenience for creating the two common types of activation factories
 * that are used: singletons of [RawEntity] and sets of [RawEntity], as well as an activation
 * factory to use when dereferencing [Reference]s.
 *
 * An implementation of this interface can be provided to the constructor for [HandleFactory]
 */
interface ActivationFactoryFactory {
    fun dereferenceFactory(): EntityActivationFactory
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
class HandleManager(
    private val time: Time,
    private val aff: ActivationFactoryFactory? = null
) {
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
        callbacks: SingletonCallbacks<RawEntity>? = null,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite,
        canRead: Boolean = true
    ): SingletonHandle<RawEntity> {
        val storeOptions = SingletonStoreOptions<RawEntity>(
            storageKey = storageKey,
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

        return SingletonHandle(
            name,
            storageProxy,
            callbacks,
            ttl,
            time,
            canRead,
            dereferencer = RawEntityDereferencer(schema, aff?.dereferenceFactory())
        ).also { storageProxy.registerHandle(it) }
    }

    /**
     * Create a new [SetHandle] backed by an Android [ServiceStore]
     *
     * The SetHandle will represent an Entity specified by the provided [Schema]
     */
    suspend fun setHandle(
        storageKey: StorageKey,
        schema: Schema,
        callbacks: SetCallbacks<RawEntity>? = null,
        name: String = storageKey.toKeyString(),
        refinement: Refinement<RawEntity>? = null,
        ttl: Ttl = Ttl.Infinite,
        canRead: Boolean = true
    ): SetHandle<RawEntity> {
        val storeOptions = SetStoreOptions<RawEntity>(
            storageKey = storageKey,
            type = CollectionType(EntityType(schema)),
            mode = StorageMode.ReferenceMode
        )

        val storageProxy = setProxiesMutex.withLock {
            setProxies.getOrPut(storageKey) {
                SetProxy(Store(storeOptions).activate(aff?.setFactory()), CrdtSet())
            }
        }

        return SetHandle(
            name,
            storageProxy,
            callbacks,
            refinement,
            ttl,
            time,
            canRead,
            dereferencer = RawEntityDereferencer(schema, aff?.dereferenceFactory())
        ).also { storageProxy.registerHandle(it) }
    }
}
