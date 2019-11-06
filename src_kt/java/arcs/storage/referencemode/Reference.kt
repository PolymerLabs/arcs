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
import arcs.crdt.internal.VersionMap
import arcs.storage.StorageKey

/**
 * [arcs.store.ReferenceModeStore] uses an expanded notion of Reference that also includes a
 * [version] and a [storageKey].
 *
 * This allows stores to block on receiving an update to contained Entities, which keeps remote
 * versions of the store in sync with each other.
 */
data class Reference(
    override val id: ReferenceId,
    val storageKey: StorageKey,
    val version: VersionMap
) : Referencable

/** Converts any [Referencable] object into a reference-mode-friendly [Reference] object. */
fun Referencable.toReference(storageKey: StorageKey, version: VersionMap) =
    Reference(id, storageKey, version)
