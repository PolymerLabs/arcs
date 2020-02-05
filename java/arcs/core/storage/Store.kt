/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtOperation
import arcs.core.type.Type

/**
 * A representation of a store.
 *
 * **Note:** Initially a constructed store will be inactive - it will not connect to a driver, will
 * not accept connections from StorageProxy objects, and no data will be read or written.
 *
 * Calling [activate] will generate an interactive store and return it.
 */
class Store<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    options: StoreOptions<Data, Op, ConsumerData>
) : IStore<Data, Op, ConsumerData> {
    override val storageKey: StorageKey = options.storageKey
    override var existenceCriteria: ExistenceCriteria = options.existenceCriteria
    override val mode: StorageMode = options.mode
    override val type: Type = options.type
    private var activeStore: ActiveStore<Data, Op, ConsumerData>? = null
        get() = synchronized(this) { field }
        set(value) = synchronized(this) { field = value }

    /**
     * If there's a parsed model then it's stored here and provided to [activate] when
     * reconstituting an [ActiveStore].
     */
    var model: Data? = options.model
    private val parsedVersionToken: String? = options.versionToken
    val versionToken: String?
        get() = activeStore?.versionToken ?: parsedVersionToken

    /**
     * Activates the [Store] by instantiating an [ActiveStore].
     *
     * Supply a custom [activationFactory] to override the default behavior.
     */
    @Suppress("UNCHECKED_CAST")
    suspend fun activate(
        activationFactory: ActiveStoreFactory? = null
    ): ActiveStore<Data, Op, ConsumerData> {
        activeStore?.let { return it }

        val options = StoreOptions(
            storageKey = storageKey,
            existenceCriteria = existenceCriteria,
            type = type,
            mode = mode,
            baseStore = this,
            versionToken = parsedVersionToken,
            model = model
        )
        // If we were given a specific factory to use, use it; otherwise use the default factory.
        @Suppress("UNCHECKED_CAST")
        /* ktlint-disable max-line-length */
        val activeStore = (activationFactory ?: defaultActiveStoreFactory).invoke(options)
        /* ktlint-enable max-line-length */

        existenceCriteria = ExistenceCriteria.ShouldExist
        this.activeStore = activeStore
        return activeStore
    }

    companion object {
        internal val DEFAULT_CONSTRUCTORS = mapOf(
            StorageMode.Direct to DirectStore.CONSTRUCTOR,
            StorageMode.Backing to BackingStore.CONSTRUCTOR,
            StorageMode.ReferenceMode to ReferenceModeStore.CONSTRUCTOR
        )

        /** Default active store factory to use when [Store.activate] is called with no argument. */
        // TODO: this is incredibly dirty to use Any, we may need a FactoryFactory.
        var defaultActiveStoreFactory: ActiveStoreFactory = DefaultActiveStoreFactory()
    }
}

interface ActiveStoreFactory {
    suspend operator fun <Data, Op, ConsumerData> invoke(
        options: StoreOptions<Data, Op, ConsumerData>
    ): ActiveStore<Data, Op, ConsumerData> where Data : CrdtData, Op : CrdtOperation
}

class DefaultActiveStoreFactory : ActiveStoreFactory {
    @Suppress("UNCHECKED_CAST")
    override suspend operator fun <Data, Op, ConsumerData> invoke(
        options: StoreOptions<Data, Op, ConsumerData>
    ): ActiveStore<Data, Op, ConsumerData> where Data : CrdtData, Op : CrdtOperation {
        val constructor = CrdtException.requireNotNull(Store.DEFAULT_CONSTRUCTORS[options.mode]) {
            "No constructor registered for mode ${options.mode}"
        }

        return CrdtException.requireNotNull(
            constructor(options) as? ActiveStore<Data, Op, ConsumerData>
        ) { "Could not cast constructed store to ActiveStore${constructor.typeParamString}" }
    }
}
