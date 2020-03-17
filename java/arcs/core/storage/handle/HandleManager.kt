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
package arcs.core.storage.handle

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.storage.ActiveStore
import arcs.core.storage.EntityActivationFactory
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
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
    fun <T : Referencable> singletonFactory(): SingletonActivationFactory<T>
    fun <T : Referencable> setFactory(): CollectionActivationFactory<T>
}

/** Convenience class for dealing with a map of [Store] instances of any type */
class Stores {
    private val storesMutex = Mutex()
    private val stores by guardedBy(storesMutex, mutableMapOf<StorageKey, Store<*, *, *>>())

    @Suppress("UNCHECKED_CAST")
    suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
        storeOptions: StoreOptions<Data, Op, T>
    ) = storesMutex.withLock {
        stores.getOrPut(storeOptions.storageKey) {
            Store(storeOptions)
        } as Store<Data, Op, T>
    }
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
    private val stores: Stores = Stores(),
    private val aff: ActivationFactoryFactory? = null
) {
    private val singletonProxiesMutex = Mutex()
    private val singletonProxies by guardedBy(
        singletonProxiesMutex,
        mutableMapOf<StorageKey, SingletonProxy<RawEntity>>()
    )
    private val singletonReferenceProxiesMutex = Mutex()
    private val singletonReferenceProxies by guardedBy(
        singletonReferenceProxiesMutex,
        mutableMapOf<StorageKey, SingletonProxy<Reference>>()
    )
    private val setProxiesMutex = Mutex()
    private val setProxies by guardedBy(
        setProxiesMutex,
        mutableMapOf<StorageKey, CollectionProxy<RawEntity>>()
    )
    private val setReferenceProxiesMutex = Mutex()
    private val setReferenceProxies by guardedBy(
        setReferenceProxiesMutex,
        mutableMapOf<StorageKey, CollectionProxy<Reference>>()
    )

    /**
     * Creates a new [SingletonHandle] which manages a singleton of type: [RawEntity], described by
     * the provided [Schema].
     */
    suspend fun rawEntitySingletonHandle(
        storageKey: StorageKey,
        schema: Schema,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite
    ): SingletonHandle<RawEntity> {
        val storeOptions = SingletonStoreOptions<RawEntity>(
            storageKey = storageKey,
            type = SingletonType(EntityType(schema)),
            mode = StorageMode.ReferenceMode
        )

        val storageProxy = singletonProxiesMutex.withLock {
            singletonProxies.getOrPut(storageKey) {
                SingletonProxy(
                    stores.get(storeOptions).activate(aff?.singletonFactory()),
                    CrdtSingleton()
                )
            }
        }

        return SingletonHandle(
            name,
            storageProxy,
            ttl,
            time,
            dereferencer = RawEntityDereferencer(schema, stores, aff?.dereferenceFactory()),
            schema = schema
        )
    }

    /**
     * Creates a new [SingletonHandle] which manages a singleton of type: [Reference], where the
     * [Reference] is expected to *reference* a [RawEntity] described by the provided [Schema].
     */
    suspend fun referenceSingletonHandle(
        storageKey: StorageKey,
        schema: Schema,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite
    ): SingletonHandle<Reference> {
        val storeOptions = SingletonStoreOptions<Reference>(
            storageKey = storageKey,
            type = SingletonType(ReferenceType(EntityType(schema))),
            mode = StorageMode.Direct
        )

        val storageProxy = singletonReferenceProxiesMutex.withLock {
            singletonReferenceProxies.getOrPut(storageKey) {
                SingletonProxy(
                    stores.get(storeOptions).activate(aff?.singletonFactory()),
                    CrdtSingleton()
                )
            }
        }

        return SingletonHandle(
            name,
            storageProxy,
            ttl,
            time,
            dereferencer = RawEntityDereferencer(schema, stores, aff?.dereferenceFactory()),
            schema = schema
        )
    }

    /**
     * Create a new [CollectionHandle] backed by an Android [ServiceStore]
     *
     * The CollectionHandle will represent an Entity specified by the provided [Schema]
     */
    suspend fun rawEntityCollectionHandle(
        storageKey: StorageKey,
        schema: Schema,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite
    ): CollectionHandle<RawEntity> {
        val storeOptions = CollectionStoreOptions<RawEntity>(
            storageKey = storageKey,
            type = CollectionType(EntityType(schema)),
            mode = StorageMode.ReferenceMode
        )

        val storageProxy = setProxiesMutex.withLock {
            setProxies.getOrPut(storageKey) {
                CollectionProxy(
                    stores.get(storeOptions).activate(aff?.setFactory()),
                    CrdtSet()
                )
            }
        }

        return CollectionHandle(
            name,
            storageProxy,
            ttl,
            time,
            dereferencer = RawEntityDereferencer(schema, stores, aff?.dereferenceFactory()),
            schema = schema
        )
    }

    /**
     * Creates a new [CollectionHandle] which manages a singleton of type: [Reference], where the
     * [Reference] is expected to *reference* a [RawEntity] described by the provided [Schema].
     */
    suspend fun referenceCollectionHandle(
        storageKey: StorageKey,
        schema: Schema,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite
    ): CollectionHandle<Reference> {
        val storeOptions = CollectionStoreOptions<Reference>(
            storageKey = storageKey,
            type = CollectionType(ReferenceType(EntityType(schema))),
            mode = StorageMode.Direct
        )

        val storageProxy = setReferenceProxiesMutex.withLock {
            setReferenceProxies.getOrPut(storageKey) {
                CollectionProxy(
                    stores.get(storeOptions).activate(aff?.setFactory()),
                    CrdtSet()
                )
            }
        }

        return CollectionHandle(
            name = name,
            storageProxy = storageProxy,
            ttl = ttl,
            time = time,
            dereferencer = RawEntityDereferencer(schema, stores, aff?.dereferenceFactory()),
            schema = schema
        )
    }
}
