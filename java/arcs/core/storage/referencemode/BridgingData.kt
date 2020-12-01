/*
 * Copyright 2020 Google LLC.
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
import arcs.core.util.resultOf

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
suspend fun RefModeStoreData.toBridgingData(
  backingStorageKey: StorageKey,
  // Callback which returns the version of the data being referenced from the backing store.
  itemVersionGetter: suspend (RawEntity) -> VersionMap
): arcs.core.util.Result<BridgingData> = resultOf {
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
    it.value.toReferenceDataValue(storageKey, itemVersionGetter)
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
    it.value.toReferenceDataValue(storageKey, itemVersionGetter)
  }.toMutableMap()
)

/** Converts a [CrdtSet.DataValue] based on [RawEntity] into one based on [Reference]. */
private suspend fun CrdtSet.DataValue<RawEntity>.toReferenceDataValue(
  storageKey: StorageKey,
  itemVersionGetter: suspend (RawEntity) -> VersionMap
): CrdtSet.DataValue<Reference> = CrdtSet.DataValue(
  versionMap,
  Reference(
    value.id,
    storageKey,
    itemVersionGetter(value),
    value.creationTimestamp,
    value.expirationTimestamp
  )
)
