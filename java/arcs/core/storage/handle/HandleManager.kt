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

import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.storage.ActivationFactory
import arcs.core.storage.ActiveStore
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.StoreManager
import arcs.core.util.Time
import arcs.core.util.guardedBy
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * [HandleManager] is a convenience for creating handles that should share [StorageProxy]ies,
 * using a provided store factory.
 *
 * This [HandleManager] creates storage-layer handles, which can be wrapped to provide ease-of-use
 * with non-storage-layer types.
 *
 * It will create a [StorageProxy] for each new [StorageKey], and keep a reference to it for as
 * long as the [HandleManager] exists.
 *
 * If no arguments are passed, the default store ActivationFactory will be used. Optionally,
 * you can provide your own ActivationFactory, which provides methods for creating
 * activations factories to create singleton-rawentity and set-rawentity [ActiveStore]s
 */
@Deprecated("Use arcs.core.host.EntityHandleManager")
class HandleManager(
    private val time: Time,
    private val storeManager: StoreManager = StoreManager(),
    private val activationFactory: ActivationFactory? = null
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
                    storeManager.get(storeOptions).activate(activationFactory),
                    CrdtSingleton()
                )
            }
        }

        return SingletonHandle(
            name,
            storageProxy,
            ttl,
            time,
            dereferencer = RawEntityDereferencer(schema, storeManager, activationFactory),
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
                    storeManager.get(storeOptions).activate(activationFactory),
                    CrdtSingleton()
                )
            }
        }

        return SingletonHandle(
            name,
            storageProxy,
            ttl,
            time,
            dereferencer = RawEntityDereferencer(schema, storeManager, activationFactory),
            schema = schema
        )
    }

    /**
     * Create a new [CollectionHandle].
     *
     * The [CollectionHandle] will represent an Entity specified by the provided [Schema]
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
                    storeManager.get(storeOptions).activate(activationFactory),
                    CrdtSet()
                )
            }
        }

        return CollectionHandle(
            name,
            storageProxy,
            ttl,
            time,
            dereferencer = RawEntityDereferencer(schema, storeManager, activationFactory),
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
                    storeManager.get(storeOptions).activate(activationFactory),
                    CrdtSet()
                )
            }
        }

        return CollectionHandle(
            name = name,
            storageProxy = storageProxy,
            ttl = ttl,
            time = time,
            dereferencer = RawEntityDereferencer(schema, storeManager, activationFactory),
            schema = schema
        )
    }
}
