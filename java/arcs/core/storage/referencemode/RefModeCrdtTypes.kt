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
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.internal.Actor
import arcs.core.crdt.internal.VersionMap
import arcs.core.data.RawEntity

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
        CrdtSet.Operation.Add<RawEntity>(clock, actor, added) {
        constructor(setOp: Add<RawEntity>) : this(setOp.actor, setOp.clock, setOp.added)
    }

    class SetRemove(actor: Actor, clock: VersionMap, removed: RawEntity) :
        Set,
        RefModeSet,
        CrdtSet.Operation.Remove<RawEntity>(clock, actor, removed) {
        constructor(setOp: Remove<RawEntity>) : this(setOp.actor, setOp.clock, setOp.removed)
    }
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
    ) : RefModeStoreOutput(), RefModeSet, Set<RawEntity> by value
}
