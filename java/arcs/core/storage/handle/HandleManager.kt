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
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.data.Ttl
import arcs.core.storage.EntityActivationFactory
import arcs.core.storage.Reference
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
    fun <T : Referencable> singletonFactory(): SingletonActivationFactory<T>
    fun <T : Referencable> setFactory(): CollectionActivationFactory<T>
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
            dereferencer = RawEntityDereferencer(schema, aff?.dereferenceFactory()),
            schema = schema
        ).also { storageProxy.registerHandle(it) }
    }

    /**
     * @deprecated use [rawEntitySingletonHandle] instead.
     */
    /* ktlint-disable max-line-length */
    @Deprecated(
        "Use rawEntitySingletonHandle instead",
        replaceWith = ReplaceWith("this.rawEntitySingletonHandle(storageKey, schema, callbacks, name, ttl, canRead)")
    )
    /* ktlint-enable max-line-length */
    suspend fun singletonHandle(
        storageKey: StorageKey,
        schema: Schema,
        callbacks: SingletonCallbacks<RawEntity>? = null,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite,
        canRead: Boolean = true
    ): SingletonHandle<RawEntity> = rawEntitySingletonHandle(
        storageKey,
        schema,
        callbacks,
        name,
        ttl,
        canRead
    )

    /**
     * Creates a new [SingletonHandle] which manages a singleton of type: [Reference], where the
     * [Reference] is expected to *reference* a [RawEntity] described by the provided [Schema].
     */
    suspend fun referenceSingletonHandle(
        storageKey: StorageKey,
        schema: Schema,
        callbacks: SingletonCallbacks<Reference>? = null,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite,
        canRead: Boolean = true
    ): SingletonHandle<Reference> {
        val storeOptions = SingletonStoreOptions<Reference>(
            storageKey = storageKey,
            type = SingletonType(ReferenceType(EntityType(schema))),
            mode = StorageMode.Direct
        )

        val storageProxy = singletonReferenceProxiesMutex.withLock {
            singletonReferenceProxies.getOrPut(storageKey) {
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
            dereferencer = RawEntityDereferencer(schema, aff?.dereferenceFactory()),
            schema = schema
        ).also { storageProxy.registerHandle(it) }
    }

    /**
     * Create a new [CollectionHandle] backed by an Android [ServiceStore]
     *
     * The CollectionHandle will represent an Entity specified by the provided [Schema]
     */
    suspend fun rawEntityCollectionHandle(
        storageKey: StorageKey,
        schema: Schema,
        callbacks: CollectionCallbacks<RawEntity>? = null,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite,
        canRead: Boolean = true
    ): CollectionHandle<RawEntity> {
        val storeOptions = CollectionStoreOptions<RawEntity>(
            storageKey = storageKey,
            type = CollectionType(EntityType(schema)),
            mode = StorageMode.ReferenceMode
        )

        val storageProxy = setProxiesMutex.withLock {
            setProxies.getOrPut(storageKey) {
                CollectionProxy(Store(storeOptions).activate(aff?.setFactory()), CrdtSet())
            }
        }

        return CollectionHandle(
            name,
            storageProxy,
            callbacks,
            ttl,
            time,
            canRead,
            dereferencer = RawEntityDereferencer(schema, aff?.dereferenceFactory()),
            schema = schema
        ).also { storageProxy.registerHandle(it) }
    }

    /**
     * @deprecated Use [rawEntityCollectionHandle] instead.
     */
    /* ktlint-disable max-line-length */
    @Deprecated(
        "Use rawEntityCollectionHandle instead",
        replaceWith = ReplaceWith("this.rawEntityCollectionHandle(storageKey, schema, callbacks, name, ttl, canRead)")
    )
    /* ktlint-enable max-line-length */
    suspend fun collectionHandle(
        storageKey: StorageKey,
        schema: Schema,
        callbacks: CollectionCallbacks<RawEntity>? = null,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite,
        canRead: Boolean = true
    ): CollectionHandle<RawEntity> = rawEntityCollectionHandle(
        storageKey,
        schema,
        callbacks,
        name,
        ttl,
        canRead
    )

    /**
     * Creates a new [CollectionHandle] which manages a singleton of type: [Reference], where the
     * [Reference] is expected to *reference* a [RawEntity] described by the provided [Schema].
     */
    suspend fun referenceCollectionHandle(
        storageKey: StorageKey,
        schema: Schema,
        callbacks: CollectionCallbacks<Reference>? = null,
        name: String = storageKey.toKeyString(),
        ttl: Ttl = Ttl.Infinite,
        canRead: Boolean = true
    ): CollectionHandle<Reference> {
        val storeOptions = CollectionStoreOptions<Reference>(
            storageKey = storageKey,
            type = CollectionType(ReferenceType(EntityType(schema))),
            mode = StorageMode.Direct
        )

        val storageProxy = setReferenceProxiesMutex.withLock {
            setReferenceProxies.getOrPut(storageKey) {
                CollectionProxy(
                    Store(storeOptions).activate(aff?.setFactory()),
                    CrdtSet()
                )
            }
        }

        return CollectionHandle(
            name = name,
            storageProxy = storageProxy,
            callbacks = callbacks,
            ttl = ttl,
            time = time,
            canRead = canRead,
            dereferencer = RawEntityDereferencer(schema, aff?.dereferenceFactory()),
            schema = schema
        ).also { storageProxy.registerHandle(it) }
    }
}
