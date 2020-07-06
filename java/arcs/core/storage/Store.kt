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
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.Store.Companion.defaultFactory
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlin.coroutines.CoroutineContext

/**
 * An interface defining a method that will create a particular [ActiveStore] instance
 * based on provided [StoreOptions] of the same type.
 *
 * An implementation of this interface should be passed to the `activate` method
 * of an inactive [Store].
 */
interface ActivationFactory {
    suspend operator fun <Data : CrdtData, Op : CrdtOperation, T> invoke(
        options: StoreOptions
    ): ActiveStore<Data, Op, T>
}

/**
 * A representation of a store.
 *
 * **Note:** Initially a constructed store will be inactive - it will not connect to a driver, will
 * not accept connections from StorageProxy objects, and no data will be read or written.
 *
 * Calling [activate] will generate an interactive store and return it.
 */
class Store<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    options: StoreOptions
) : IStore<Data, Op, ConsumerData> {
    override val storageKey: StorageKey = options.storageKey
    override val type: Type = options.type
    private val coroutineContext: CoroutineContext = options.clearCoroutineContext
    private var activeStore: ActiveStore<Data, Op, ConsumerData>? = null
        get() = synchronized(this) { field }
        set(value) = synchronized(this) { field = value }

    /**
     * If there's a parsed model then it's stored here and provided to [activate] when
     * reconstituting an [ActiveStore].
     */
    private val parsedVersionToken: String? = options.versionToken
    val versionToken: String?
        get() = activeStore?.versionToken ?: parsedVersionToken

    /**
     * Activates the [Store] by instantiating an [ActiveStore].
     *
     * Supply a custom [activationFactory] to override the default behavior.
     */
    @ExperimentalCoroutinesApi
    suspend fun activate(
        activationFactory: ActivationFactory? = null
    ): ActiveStore<Data, Op, ConsumerData> {
        activeStore?.let { return it }

        val options = StoreOptions(
            storageKey = storageKey,
            type = type,
            versionToken = parsedVersionToken,
            clearCoroutineContext = coroutineContext
        )
        // If we were given a specific factory to use, use it; otherwise use the default factory.
        val activeStore =
            (activationFactory ?: defaultFactory).invoke<Data, Op, ConsumerData>(options)

        this.activeStore = activeStore
        return activeStore
    }

    suspend fun waitForActiveIdle() {
        activeStore?.idle()
    }

    @Suppress("UNCHECKED_CAST")
    companion object {
        /**
         * This is a helper method to reduce the space of UNCHECKED_CAST suppression when accessing
         * the [defaultFactory] instance.
         */
        @ExperimentalCoroutinesApi
        val defaultFactory = object : ActivationFactory {
            override suspend fun <Data : CrdtData, Op : CrdtOperation, T> invoke(
                options: StoreOptions
            ): ActiveStore<Data, Op, T> = when (options.storageKey) {
                is ReferenceModeStorageKey ->
                    ReferenceModeStore.create(options) as ActiveStore<Data, Op, T>
                else -> DirectStore.create(options)
            }
        }
    }
}
