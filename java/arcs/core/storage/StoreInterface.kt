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
import arcs.core.type.Type
import kotlin.reflect.KClass

/** Base interface which all store implementations must extend from. */
interface IStore<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    val storageKey: StorageKey
    val existenceCriteria: ExistenceCriteria
    val mode: StorageMode
    val type: Type
}

/**
 * Wrapper for a function which can be used to construct a store for a given model of type [Data] as
 * well as provide ample information to support looking the constructor up by expected types.
 */
data class StoreConstructor(
    /* internal */
    val dataClass: KClass<out CrdtData>,
    /* internal */
    val opClass: KClass<out CrdtOperation>,
    /* internal */
    val consumerDataClass: KClass<*>,
    private val constructor: suspend (StoreOptions<*, *, *>, KClass<*>) -> ActiveStore<*, *, *>
) {
    val typeParamString: String
        get() = "<$dataClass, $opClass, $consumerDataClass>"

    /* internal */ suspend operator fun <Data : CrdtData, Op : CrdtOperation, ConsumerData> invoke(
        options: StoreOptions<Data, Op, ConsumerData>,
        dataClass: KClass<*>
    ) = constructor(options, dataClass)
}

/**
 * Pseudo-constructor which can be used to denote a suspending function capable of generating an
 * [ActiveStore] instance as a [StoreConstructor].
 */
inline fun <reified Data, reified Op, reified ConsumerData> StoreConstructor(
    noinline constructor: suspend (StoreOptions<*, *, *>, KClass<*>) -> ActiveStore<*, *, *>
): StoreConstructor where Data : CrdtData, Op : CrdtOperation =
    StoreConstructor(Data::class, Op::class, ConsumerData::class, constructor)

/**
 * Modes for Storage.
 *
 * TODO: need actual, helpful kdoc for these.
 */
enum class StorageMode {
    Direct,
    Backing,
    ReferenceMode,
}

/** Wrapper for options which will be used to construct a [Store]. */
data class StoreOptions<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    val storageKey: StorageKey,
    val existenceCriteria: ExistenceCriteria,
    val type: Type,
    val mode: StorageMode =
        if (storageKey is ReferenceModeStorageKey) StorageMode.ReferenceMode
        else StorageMode.Direct,
    val baseStore: IStore<Data, Op, ConsumerData>? = null,
    val versionToken: String? = null,
    val model: Data? = null
)
