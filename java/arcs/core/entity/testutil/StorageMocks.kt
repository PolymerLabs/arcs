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
package arcs.core.entity.testutil

import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.entity.CollectionProxy
import arcs.core.entity.SingletonProxy
import arcs.core.entity.StorageAdapter
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.mock
import kotlinx.coroutines.CompletableDeferred

fun mockStorageAdapter(): StorageAdapter<DummyEntity, DummyEntitySlice, RawEntity> {
  return mock {
    on { referencableToStorable(any()) }.then {
      DummyEntity((it.arguments[0] as RawEntity).id)
    }
    on { storableToReferencable(any()) }.then {
      RawEntity((it.arguments[0] as DummyEntity).entityId ?: NO_REFERENCE_ID)
    }
  }
}

fun mockSingletonStorageProxy(): SingletonProxy<RawEntity> {
  val proxyVersionMap = VersionMap()
  return mock {
    on { getVersionMap() }.then { proxyVersionMap }
    on { applyOp(any()) }.then { CompletableDeferred(true) }
    on { applyOps(any()) }.then { CompletableDeferred(true) }
    on { prepareForSync() }.then { Unit }
    on { addOnUpdate(any(), any()) }.then { Unit }
    on { addOnResync(any(), any()) }.then { Unit }
    on { addOnDesync(any(), any()) }.then { Unit }
  }
}

fun mockCollectionStorageProxy(): CollectionProxy<RawEntity> {
  val proxyVersionMap = VersionMap()
  return mock {
    on { getVersionMap() }.then { proxyVersionMap }
    on { applyOp(any()) }.then { CompletableDeferred(true) }
    on { applyOps(any()) }.then { CompletableDeferred(true) }
    on { prepareForSync() }.then { Unit }
    on { addOnUpdate(any(), any()) }.then { Unit }
    on { addOnResync(any(), any()) }.then { Unit }
    on { addOnDesync(any(), any()) }.then { Unit }
  }
}
