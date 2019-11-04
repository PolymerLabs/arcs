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
import arcs.crdt.CrdtException
import arcs.crdt.CrdtModel
import arcs.crdt.CrdtOperationAtTime
import arcs.crdt.CrdtSet
import arcs.crdt.CrdtSingleton
import arcs.crdt.internal.VersionMap
import arcs.data.RawEntity
import arcs.storage.StorageKey
import arcs.util.resultOf

/**
 * Result of converting an incoming CRDT model into updated data for the backing and collection
 * stores.
 */
data class NewModels(
    val backingModels: Collection<RawEntity>?,
    val collectionModel: CrdtModel<out CrdtSet.Data<Reference>, out CrdtOperationAtTime, out Any?>
)

/**
 * Converts a raw [CrdtData] object seen by the [ReferenceModeStore] into a [Reference]-based
 * [CrdtData] object for use with the Container store.
 */
fun CrdtData.toReferenceCrdt(
    storageKey: StorageKey,
    // Callback which returns the version of the data being referenced from the backing store.
    itemVersionGetter: (ReferenceId) -> VersionMap
): arcs.util.Result<NewModels> = resultOf {
    when (this) {
        is CrdtSet.Data<*> -> NewModels(
            null,
            CrdtSet.createWithData(this.toReferenceData(storageKey, itemVersionGetter))
        )
        is CrdtSingleton.Data<*> -> NewModels(
            null,
            CrdtSingleton.createWithData(this.toReferenceData(storageKey, itemVersionGetter))
        )
        else -> throw CrdtException("Unsupported CrdtModel for ReferenceModeStore: $this")
    }
}

/**
 * Converts a generic [CrdtSet.Data] object, where values are of any [Referencable] type, to a
 * reference-mode-store-friendly version with values of type [Reference].
 */
fun <T : Referencable> CrdtSet.Data<T>.toReferenceData(
    storageKey: StorageKey,
    // Callback which returns the version of the data being referenced from the backing store.
    itemVersionGetter: (ReferenceId) -> VersionMap
): CrdtSet.Data<Reference> =
    CrdtSet.DataImpl(
        versionMap.copy(),
        values.mapValues {
            it.value.toReferenceDataValue(storageKey, versionMap, itemVersionGetter)
        }.toMutableMap()
    )

/**
 * Converts a generic [CrdtSingleton.Data] object, where values are of any [Referencable] type, to a
 * reference-mode-store-friendly version with values of type [Reference].
 */
fun <T : Referencable> CrdtSingleton.Data<T>.toReferenceData(
    storageKey: StorageKey,
    // Callback which returns the version of the data being referenced from the backing store.
    itemVersionGetter: (ReferenceId) -> VersionMap
): CrdtSingleton.Data<Reference> =
    CrdtSingleton.DataImpl(
        versionMap.copy(),
        values.mapValues {
            it.value.toReferenceDataValue(storageKey, versionMap, itemVersionGetter)
        }.toMutableMap()
    )

fun <T : Referencable> CrdtSet.DataValue<T>.toReferenceDataValue(
    storageKey: StorageKey,
    valueVersion: VersionMap,
    itemVersionGetter: (ReferenceId) -> VersionMap
) = CrdtSet.DataValue(valueVersion.copy(), Reference(value.id, storageKey, itemVersionGetter(value.id)))

private suspend fun <T : Referencable> T.tryBackingStoreUpdate(
    itemUpdater: suspend (Referencable) -> Boolean
) {
    if (!itemUpdater(this)) {
        throw CrdtException("Could not update item $this in backing store.")
    }
}
