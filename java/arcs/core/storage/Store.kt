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
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtOperation
import arcs.core.data.RawEntity
import arcs.core.storage.Store.Companion.defaultFactory
import arcs.core.type.Type

/**
 * An interface defining a method that will create a particular [ActivateStore] instance
 * based on provided [StoreOptions] of the same type.
 *
 * An implementation of this interface should be passed to the `activate` method
 * of an inactive [Store].
 */
interface ActivationFactory<Data : CrdtData, Op : CrdtOperation, T> {
    suspend operator fun invoke(options: StoreOptions<Data, Op, T>): ActiveStore<Data, Op, T>
}

/** Type-alias for an [ActivationFactory] to use when de-referencing [Reference]s. */
typealias EntityActivationFactory =
    ActivationFactory<CrdtEntity.Data, CrdtEntity.Operation, RawEntity>

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
    suspend fun activate(
        activationFactory: ActivationFactory<Data, Op, ConsumerData>? = null
    ): ActiveStore<Data, Op, ConsumerData> {
        activeStore?.let { return it }

        val options = StoreOptions(
            storageKey = storageKey,
            type = type,
            mode = mode,
            baseStore = this,
            versionToken = parsedVersionToken,
            model = model
        )
        // If we were given a specific factory to use, use it; otherwise use the default factory.
        val activeStore = (activationFactory ?: getDefaultFactory()).invoke(options)

        this.activeStore = activeStore
        return activeStore
    }

    companion object {
        private val DEFAULT_CONSTRUCTORS = mapOf(
            StorageMode.Direct to DirectStore.CONSTRUCTOR,
            StorageMode.Backing to BackingStore.CONSTRUCTOR,
            StorageMode.ReferenceMode to ReferenceModeStore.CONSTRUCTOR
        )

        /**
         * This is a helper method to reduce the space of UNCHECKED_CAST suppression when accessing
         * the [defaultFactory] instance.
         */
        @Suppress("UNCHECKED_CAST")
        private fun <Data : CrdtData, Op : CrdtOperation, T> getDefaultFactory() =
            defaultFactory as ActivationFactory<Data, Op, T>

        private val defaultFactory = object : ActivationFactory<CrdtData, CrdtOperation, Any> {
            override suspend fun invoke(
                options: StoreOptions<CrdtData, CrdtOperation, Any>
            ): ActiveStore<CrdtData, CrdtOperation, Any> {
                val constructor = CrdtException.requireNotNull(DEFAULT_CONSTRUCTORS[options.mode]) {
                    "No constructor registered for mode ${options.mode}"
                }

                val dataClass = when (val type = options.type) {
                    is CrdtModelType<*, *, *> -> type.crdtModelDataClass
                    else -> throw CrdtException("Unsupported type for storage: $type")
                }

                @Suppress("UNCHECKED_CAST")
                return CrdtException.requireNotNull(
                    constructor(options, dataClass) as? ActiveStore<CrdtData, CrdtOperation, Any>
                ) {
                    "Could not cast constructed store to ActiveStore${constructor.typeParamString}"
                }
            }
        }
    }
}
