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
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.util.resultOfSuspend

/**
 * Result of converting an incoming CRDT model into updated data for the backing and collection
 * stores.
 */
data class BridgingData(
    val backingModels: Collection<RawEntity>,
    val collectionModel: CrdtModel<out CrdtSet.Data<Reference>, out CrdtOperationAtTime, out Any?>
)

/**
 * Converts a [RefModeStoreData] object seen by the [ReferenceModeStore] into a [Reference]-based
 * [CrdtData] object for use with the container store.
 */
suspend fun RefModeStoreData.toBridgingData(
    backingStorageKey: StorageKey,
    // Callback which returns the version of the data being referenced from the backing store.
    itemVersionGetter: suspend (RawEntity) -> VersionMap
): arcs.core.util.Result<BridgingData> = resultOfSuspend {
    when (this) {
        is RefModeStoreData.Set -> BridgingData(
            this.values.values.map { it.value }, // So many values.
            CrdtSet.createWithData(this.toReferenceData(backingStorageKey, itemVersionGetter))
        )
        is RefModeStoreData.Singleton -> BridgingData(
            this.values.values.map { it.value }, // So many values.
            CrdtSingleton.createWithData(this.toReferenceData(backingStorageKey, itemVersionGetter))
        )
    }
}

/**
 * Converts a [RefModeStoreData.Set] object, where values are of [RawEntity] type, to a
 * container-store-friendly version with values of type [Reference].
 */
private suspend fun RefModeStoreData.Set.toReferenceData(
    storageKey: StorageKey,
    // Callback which returns the version of the data being referenced from the backing store.
    itemVersionGetter: suspend (RawEntity) -> VersionMap
): CrdtSet.Data<Reference> = CrdtSet.DataImpl(
    versionMap.copy(),
    values.mapValues {
        it.value.toReferenceDataValue(storageKey, versionMap, itemVersionGetter)
    }.toMutableMap()
)

/**
 * Converts a [RefModeStoreData.Singleton] object, where values are of [RawEntity] type, to a
 * container-store-friendly version with values of type [Reference].
 */
private suspend fun RefModeStoreData.Singleton.toReferenceData(
    storageKey: StorageKey,
    // Callback which returns the version of the data being referenced from the backing store.
    itemVersionGetter: suspend (RawEntity) -> VersionMap
): CrdtSingleton.Data<Reference> = CrdtSingleton.DataImpl(
    versionMap.copy(),
    values.mapValues {
        it.value.toReferenceDataValue(storageKey, versionMap, itemVersionGetter)
    }.toMutableMap()
)

/** Converts a [CrdtSet.DataValue] based on [RawEntity] into one based on [Reference]. */
private suspend fun CrdtSet.DataValue<RawEntity>.toReferenceDataValue(
    storageKey: StorageKey,
    valueVersion: VersionMap,
    itemVersionGetter: suspend (RawEntity) -> VersionMap
): CrdtSet.DataValue<Reference> = CrdtSet.DataValue(
    valueVersion.copy(),
    Reference(value.id, storageKey, itemVersionGetter(value))
)

/** Converts a [CrdtSet.Data] of [Reference]s into a [Set] of those [Reference]s. */
inline fun <reified T : Referencable> CrdtSet.Data<T>.toReferenceSet(): Set<Reference> {
    require(T::class == Reference::class) { "CrdtSet.Data<Reference> is required" }
    return values.values.map { it.value as Reference }.toSet()
}

/** Converts a [Set] of [Reference]s into a [CrdtSet.Data] of those [Reference]s. */
fun Set<Reference>.toCrdtSetData(versionMap: VersionMap): CrdtSet.Data<Reference> {
    return CrdtSet.DataImpl(
        versionMap.copy(),
        this.associateBy { it.id }
            .mapValues { CrdtSet.DataValue(versionMap.copy(), it.value) }
            .toMutableMap()
    )
}

/** Converts a [CrdtSingleton.Data] into a nullable [Reference]. */
inline fun <reified T : Referencable> CrdtSingleton.Data<T>.toReferenceSingleton(): Reference? {
    require(T::class == Reference::class) { "CrdtSingleton.Data<Reference> is required" }
    // Eerily-similar to the implementation of CrdtSingleton.consumerView.
    return values.values.maxBy { it.value.id }?.value as? Reference
}

/** Converts a nullable [Reference] into a [CrdtSingleton.Data]. */
fun Reference?.toCrdtSingletonData(versionMap: VersionMap): CrdtSingleton.Data<Reference> {
    if (this == null) return CrdtSingleton.DataImpl(versionMap.copy())
    return CrdtSingleton.DataImpl(
        versionMap.copy(),
        mutableMapOf(this.id to CrdtSet.DataValue(versionMap.copy(), this))
    )
}
