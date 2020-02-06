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

package arcs.core.storage.referencemode

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.internal.Actor
import arcs.core.crdt.internal.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.RawEntity
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.storage.ProxyMessage
import arcs.core.type.Type

/**
 * This file defines several classes and interfaces used to allow clients to interact with
 * [arcs.storage.ReferenceModeStore]s using Crdt-styled operations, and receive their data as
 * Crdt-styled data.
 */

/**
 * Denotes [CrdtData], [CrdtOperation], and consumer-data types as intended for an
 * [arcs.storage.ReferenceModeStore] acting as a [CrdtSet] of [RawEntity]s.
 */
interface RefModeSet

/**
 * Denotes [CrdtData], [CrdtOperation], and consumer-data types as intended for an
 * [arcs.storage.ReferenceModeStore] acting as a [CrdtSingleton] managing a [RawEntity].
 */
interface RefModeSingleton

/** Backing crdt-styled data for a [arcs.storage.ReferenceModeStore]. */
sealed class RefModeStoreData : CrdtData {
    abstract val values: MutableMap<ReferenceId, CrdtSet.DataValue<RawEntity>>

    data class Singleton(
        override var versionMap: VersionMap,
        override val values: MutableMap<ReferenceId, CrdtSet.DataValue<RawEntity>>
    ) : RefModeStoreData(), RefModeSingleton, CrdtSingleton.Data<RawEntity> {
        constructor(data: CrdtSingleton.Data<RawEntity>) : this(data.versionMap, data.values)

        override fun copy(): CrdtSingleton.Data<RawEntity> =
            Singleton(
                versionMap.copy(),
                values.mapValues { CrdtSet.DataValue(it.value.versionMap, it.value.value) }
                    .toMutableMap()
            )
    }

    data class Set(
        override var versionMap: VersionMap,
        override val values: MutableMap<ReferenceId, CrdtSet.DataValue<RawEntity>>
    ) : RefModeStoreData(), RefModeSet, CrdtSet.Data<RawEntity> {
        constructor(data: CrdtSet.Data<RawEntity>) : this(data.versionMap, data.values)

        override fun copy(): CrdtSet.Data<RawEntity> =
            Set(
                versionMap.copy(),
                values.mapValues { CrdtSet.DataValue(it.value.versionMap, it.value.value) }
                    .toMutableMap()
            )
    }
}

/** Valid crdt-style operations for a [arcs.storage.ReferenceModeStore]. */
interface RefModeStoreOp : CrdtOperationAtTime {
    interface Singleton : RefModeStoreOp, CrdtSingleton.IOperation<RawEntity>

    class SingletonUpdate(actor: Actor, clock: VersionMap, value: RawEntity) :
        Singleton,
        RefModeSingleton,
        CrdtSingleton.Operation.Update<RawEntity>(actor, clock, value) {
        constructor(
            singletonOp: Update<RawEntity>
        ) : this(singletonOp.actor, singletonOp.clock, singletonOp.value)
    }
    class SingletonClear(actor: Actor, clock: VersionMap) :
        Singleton,
        RefModeSingleton,
        CrdtSingleton.Operation.Clear<RawEntity>(actor, clock) {
        constructor(singletonOp: Clear<RawEntity>) : this(singletonOp.actor, singletonOp.clock)
    }

    interface Set : RefModeStoreOp, CrdtSet.IOperation<RawEntity>

    class SetAdd(actor: Actor, clock: VersionMap, added: RawEntity) :
        Set,
        RefModeSet,
        CrdtSet.Operation.Add<RawEntity>(actor, clock, added) {
        constructor(setOp: Add<RawEntity>) : this(setOp.actor, setOp.clock, setOp.added)
    }

    class SetRemove(actor: Actor, clock: VersionMap, removed: RawEntity) :
        Set,
        RefModeSet,
        CrdtSet.Operation.Remove<RawEntity>(actor, clock, removed) {
        constructor(setOp: Remove<RawEntity>) : this(setOp.actor, setOp.clock, setOp.removed)
    }
}

/** Consumer data value of the [arcs.core.storage.ReferenceModeStore]. */
sealed class RefModeStoreOutput : Referencable {
    data class DereferencedSingleton(
        override val id: ReferenceId,
        val value: RawEntity
    ) : RefModeStoreOutput(), RefModeSingleton

    data class DereferencedSet(
        override val id: ReferenceId,
        val value: Set<RawEntity>
    ) : RefModeStoreOutput(), RefModeSet, Set<RawEntity> by value
}

/** Alias for [ProxyMessage]s pertaining to the [arcs.core.storage.ReferenceModeStore]. */
typealias RefModeMessage =
    ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>

/**
 * Alias for [ProxyMessage.ModelUpdate]s pertaining to the [arcs.core.storage.ReferenceModeStore].
 */
typealias RefModeModelUpdate =
    ProxyMessage.ModelUpdate<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>

/**
 * Alias for [ProxyMessage.Operations] messages pertaining to the
 * [arcs.core.storage.ReferenceModeStore].
 */
typealias RefModeOperations =
    ProxyMessage.Operations<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>

/**
 * Alias for [ProxyMessage.SyncRequest] messages pertaining to the
 * [arcs.core.storage.ReferenceModeStore].
 */
typealias RefModeSyncRequest =
    ProxyMessage.SyncRequest<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>

/**
 * Sanitizes messages coming from the [StorageProxy] for use with the
 * [arcs.core.storage.ReferenceModeStore] by converting them into messages of the type expected by
 * the store. See [RefModeMessage].
 */
@Suppress("UNCHECKED_CAST")
fun ProxyMessage<*, *, *>.sanitizeForRefModeStore(storeType: Type): RefModeMessage = when (this) {
    is ProxyMessage.ModelUpdate<*, *, *> -> sanitizeModelUpdate(storeType)
    is ProxyMessage.Operations<*, *, *> -> sanitizeOperations(storeType)
    is ProxyMessage.SyncRequest<*, *, *> -> this as RefModeSyncRequest
}

@Suppress("UNCHECKED_CAST")
private fun ProxyMessage.ModelUpdate<*, *, *>.sanitizeModelUpdate(
    storeType: Type
): RefModeModelUpdate = when (storeType) {
    is CollectionType<*> -> {
        if (model !is CrdtSet.Data<*>) {
            throw CrdtException(
                "ReferenceModeStore is managing a Set, Singleton messages not supported"
            )
        }

        if (model !is RefModeStoreData)
            RefModeModelUpdate(
                RefModeStoreData.Set(model as CrdtSet.Data<RawEntity>),
                id
            )
        else this as RefModeModelUpdate
    }
    is ReferenceType<*>,
    is SingletonType<*> -> {
        if (model !is CrdtSingleton.Data<*>) {
            throw CrdtException(
                "ReferenceModeStore is managing a Singleton, Set messages not supported"
            )
        }
        if (model !is RefModeStoreData.Singleton) {
            RefModeModelUpdate(
                RefModeStoreData.Singleton(model as CrdtSingleton.Data<RawEntity>),
                id
            )
        } else {
            this as RefModeModelUpdate
        }
    }
    else -> throw IllegalArgumentException("Invalid store type: $storeType")
}

@Suppress("UNCHECKED_CAST", "IMPLICIT_CAST_TO_ANY")
private fun ProxyMessage.Operations<*, *, *>.sanitizeOperations(
    storeType: Type
): RefModeOperations {
    val firstOp = operations.firstOrNull()

    if ((firstOp is RefModeStoreOp.Set || firstOp == null) && storeType is CollectionType<*>)
        return this as RefModeOperations

    if (
        (firstOp is RefModeStoreOp.Singleton || firstOp == null) &&
        (storeType is ReferenceType<*> || storeType is SingletonType<*>)
    ) return this as RefModeOperations

    return when (storeType) {
        is CollectionType<*> -> {
            if (firstOp !is CrdtSet.Operation<*>?) {
                throw CrdtException(
                    "ReferenceModeStore is managing a Set, Singleton messages not supported"
                )
            }

            RefModeOperations(
                operations.map {
                    val op = it as CrdtSet.Operation<RawEntity>
                    when (op) {
                        is CrdtSet.Operation.Add<*> ->
                            RefModeStoreOp.SetAdd(it as CrdtSet.Operation.Add<RawEntity>)
                        is CrdtSet.Operation.Remove<*> ->
                            RefModeStoreOp.SetRemove(it as CrdtSet.Operation.Remove<RawEntity>)
                        is CrdtSet.Operation.FastForward<*> ->
                            throw IllegalArgumentException(
                                "ReferenceModeStore does not support FastForward"
                            )
                    } as RefModeStoreOp
                },
                id
            )
        }
        is ReferenceType<*>,
        is SingletonType<*> -> {
            if (firstOp !is CrdtSingleton.Operation<*>?) {
                throw CrdtException(
                    "ReferenceModeStore is managing a Singleton, Set messages not supported"
                )
            }
            RefModeOperations(
                operations.map {
                    val op = it as CrdtSingleton.Operation<RawEntity>
                    when (op) {
                        is CrdtSingleton.Operation.Update<*> ->
                            RefModeStoreOp.SingletonUpdate(
                                it as CrdtSingleton.Operation.Update<RawEntity>
                            )
                        is CrdtSingleton.Operation.Clear<*> ->
                            RefModeStoreOp.SingletonClear(
                                it as CrdtSingleton.Operation.Clear<RawEntity>
                            )
                    } as RefModeStoreOp
                },
                id
            )
        }
        else -> throw IllegalArgumentException("Invalid store type: $storeType")
    }
}
