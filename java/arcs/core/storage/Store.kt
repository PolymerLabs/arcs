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
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * The default implementation of [ActivationFactory]. This object will create a [ReferenceModeStore]
 * when invoked with [StoreOptions] where [options.storageKey] is of type [ReferenceModeStorageKey],
 * otherwise a [DirectStore] will be created.
 */
@ExperimentalCoroutinesApi
@Suppress("UNCHECKED_CAST")
val defaultFactory = object : ActivationFactory {
    override suspend fun <Data : CrdtData, Op : CrdtOperation, T> invoke(
        options: StoreOptions
    ): ActiveStore<Data, Op, T> = when (options.storageKey) {
        is ReferenceModeStorageKey ->
            ReferenceModeStore.create(options) as ActiveStore<Data, Op, T>
        else -> DirectStore.create(options)
    }
}

/**
 * An interface defining a method that will create a particular [ActiveStore] instance
 * based on provided [StoreOptions].
 */
interface ActivationFactory {
    suspend operator fun <Data : CrdtData, Op : CrdtOperation, T> invoke(
        options: StoreOptions
    ): ActiveStore<Data, Op, T>
}
