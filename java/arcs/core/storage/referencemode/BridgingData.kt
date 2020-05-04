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

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey

/**
 * Result of converting an incoming CRDT model into updated data for the backing and collection
 * stores.
 */
data class BridgingData(
    val backingModels: Collection<RawEntity>,
    val collectionModel: CrdtModel<out CrdtData, out CrdtOperationAtTime, out Any?>
)

/**
 * Converts a [RefModeStoreData] object seen by the [ReferenceModeStore] into a [Reference]-based
 * [CrdtData] object for use with the container store.
 */
fun RefModeStoreData.toBridgingData(
    backingStorageKey: StorageKey
): BridgingData =
    when (this) {
        is RefModeStoreData.Set -> BridgingData(
            this.values.values.map { it.value }, // So many values.
            CrdtSet.createWithData(this.toReferenceData(backingStorageKey))
        )
        is RefModeStoreData.Singleton -> BridgingData(
            this.values.values.map { it.value }, // So many values.
            CrdtSingleton.createWithData(this.toReferenceData(backingStorageKey))
        )
    }

/**
 * Converts a [RefModeStoreData.Set] object, where values are of [RawEntity] type, to a
 * container-store-friendly version with values of type [Reference].
 */
private fun RefModeStoreData.Set.toReferenceData(
    storageKey: StorageKey
): CrdtSet.Data<Reference> = CrdtSet.DataImpl(
    versionMap.copy(),
    values.mapValues {
        it.value.toReferenceDataValue(storageKey)
    }.toMutableMap()
)

/**
 * Converts a [RefModeStoreData.Singleton] object, where values are of [RawEntity] type, to a
 * container-store-friendly version with values of type [Reference].
 */
private fun RefModeStoreData.Singleton.toReferenceData(
    storageKey: StorageKey
): CrdtSingleton.Data<Reference> = CrdtSingleton.DataImpl(
    versionMap.copy(),
    values.mapValues { it.value.toReferenceDataValue(storageKey) }.toMutableMap()
)

/** Converts a [CrdtSet.DataValue] based on [RawEntity] into one based on [Reference]. */
private fun CrdtSet.DataValue<RawEntity>.toReferenceDataValue(
    storageKey: StorageKey
): CrdtSet.DataValue<Reference> = CrdtSet.DataValue(
    versionMap,
    Reference(value.id, storageKey, versionMap, value.creationTimestamp, value.expirationTimestamp)
)

/** Converts a [Set] of [Reference]s into a [CrdtSet.Data] of those [Reference]s. */
fun Set<Reference>.toCrdtSetData(versionMap: VersionMap): CrdtSet.Data<Reference> {
    return CrdtSet.DataImpl(
        versionMap.copy(),
        this.associateBy { it.id }
            .mapValues { CrdtSet.DataValue(it.value.version!!, it.value) }
            .toMutableMap()
    )
}

/** Converts a nullable [Reference] into a [CrdtSingleton.Data]. */
fun Reference?.toCrdtSingletonData(versionMap: VersionMap): CrdtSingleton.Data<Reference> {
    if (this == null) return CrdtSingleton.DataImpl(versionMap.copy())
    return CrdtSingleton.DataImpl(
        versionMap.copy(),
        mutableMapOf(this.id to CrdtSet.DataValue(this.version!!, this))
    )
}
