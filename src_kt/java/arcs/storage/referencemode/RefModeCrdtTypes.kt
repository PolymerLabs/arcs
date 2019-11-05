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

package arcs.storage.referencemode

import arcs.common.Referencable
import arcs.common.ReferenceId
import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperationAtTime
import arcs.crdt.CrdtSet
import arcs.crdt.CrdtSingleton
import arcs.crdt.internal.Actor
import arcs.crdt.internal.VersionMap
import arcs.data.RawEntity

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
    class SingletonUpdate(actor: Actor, clock: VersionMap, value: RawEntity)
        : RefModeStoreOp,
        RefModeSingleton,
        CrdtSingleton.Operation.Update<RawEntity>(actor, clock, value)
    class SingletonClear(actor: Actor, clock: VersionMap)
        : RefModeStoreOp,
        RefModeSingleton,
        CrdtSingleton.Operation.Clear<RawEntity>(actor, clock)

    class SetAdd(actor: Actor, clock: VersionMap, added: RawEntity)
        : RefModeStoreOp,
        RefModeSet,
        CrdtSet.Operation.Add<RawEntity>(clock, actor, added)

    class SetRemove(actor: Actor, clock: VersionMap, removed: RawEntity)
        : RefModeStoreOp,
        RefModeSet,
        CrdtSet.Operation.Remove<RawEntity>(clock, actor, removed)
}

/** Consumer data value of the [arcs.storage.ReferenceModeStore]. */
sealed class RefModeStoreOutput : Referencable {
    data class DereferencedSingleton(
        override val id: ReferenceId,
        val value: RawEntity
    ) : RefModeStoreOutput(), RefModeSingleton

    data class DereferencedSet(
        override val id: ReferenceId,
        val value: Set<RawEntity>
    ) : RefModeStoreOutput(), RefModeSet
}
