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

import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.storage.RawReference
import arcs.core.storage.StorageKey
import arcs.core.storage.referencemode.BridgingOperation.AddToSet
import arcs.core.storage.referencemode.BridgingOperation.ClearSet
import arcs.core.storage.referencemode.BridgingOperation.ClearSingleton
import arcs.core.storage.referencemode.BridgingOperation.RemoveFromSet
import arcs.core.storage.referencemode.BridgingOperation.UpdateSingleton
import arcs.core.storage.toReference

/**
 * Represents a bridge between the [CrdtSet]/[CrdtSingleton]'s operations from the
 * [arcs.storage.ReferenceModeStore]'s `containerStore` with the client's expected
 * [RefModeStoreOp]s.
 *
 * When the [arcs.storage.ReferenceModeStore] handles communication between external storage proxies
 * and the internal containerStore, this class (and its subclasses) is used as a translation medium.
 */
sealed class BridgingOperation : CrdtOperation {
  abstract val entityValue: RawEntity?

  /** Represents a value added/removed from a [CrdtSet] or configured for a [CrdtSingleton]. */
  abstract val referenceValue: RawReference?

  /** The actual [CrdtSet] or [CrdtSingleton] operation. */
  abstract val containerOp: CrdtOperation

  /** The operation sent to the [arcs.storage.ReferenceModeStore]. */
  abstract val refModeOp: RefModeStoreOp

  /** Denotes an update to the [CrdtSingleton] managed by the store. */
  data class UpdateSingleton /* internal */ constructor(
    override val entityValue: RawEntity?,
    override val referenceValue: RawReference?,
    override val containerOp: CrdtSingleton.Operation.Update<RawReference>,
    override val refModeOp: RefModeStoreOp.SingletonUpdate
  ) : BridgingOperation() {
    override val versionMap: VersionMap = containerOp.versionMap
  }

  /** Denotes a clearing of the [CrdtSingleton] managed by the store. */
  data class ClearSingleton /* internal */ constructor(
    override val containerOp: CrdtSingleton.Operation.Clear<RawReference>,
    override val refModeOp: RefModeStoreOp.SingletonClear
  ) : BridgingOperation() {
    override val entityValue: RawEntity? = null
    override val referenceValue: RawReference? = null
    override val versionMap: VersionMap = containerOp.versionMap
  }

  /** Denotes an addition to the [CrdtSet] managed by the store. */
  class AddToSet /* internal */ constructor(
    override val entityValue: RawEntity?,
    override val referenceValue: RawReference?,
    override val containerOp: CrdtSet.Operation.Add<RawReference>,
    override val refModeOp: RefModeStoreOp.SetAdd
  ) : BridgingOperation() {
    override val versionMap: VersionMap = containerOp.versionMap
  }

  /** Denotes a removal from the [CrdtSet] managed by the store. */
  class RemoveFromSet /* internal */ constructor(
    val referenceId: ReferenceId,
    override val containerOp: CrdtSet.Operation.Remove<RawReference>,
    override val refModeOp: RefModeStoreOp.SetRemove
  ) : BridgingOperation() {
    override val entityValue: RawEntity? = null
    override val referenceValue: RawReference? = null
    override val versionMap: VersionMap = containerOp.versionMap
  }

  /** Denotes a clear of the [CrdtSet] managed by the store. */
  class ClearSet /* internal */ constructor(
    override val containerOp: CrdtSet.Operation.Clear<RawReference>,
    override val refModeOp: RefModeStoreOp.SetClear
  ) : BridgingOperation() {
    override val entityValue: RawEntity? = null
    override val referenceValue: RawReference? = null
    override val versionMap: VersionMap = containerOp.versionMap
  }
}

/**
 * Converts a [List] of [CrdtOperation]s to a [List] of [BridgingOperation]s.
 *
 * Since [arcs.storage.ReferenceModeStore] only supports operations on [CrdtSingleton]s or
 * [CrdtSet]s, this method will throw [CrdtException] if any member of the list is not one of those
 * types of [CrdtOperation]s.
 */
suspend fun List<RefModeStoreOp>.toBridgingOps(
  backingStorageKey: StorageKey,
  // Callback which returns the version of the data being referenced from the backing store.
  itemVersionGetter: suspend (RawEntity) -> VersionMap
): List<BridgingOperation> {
  return map { it.toBridgingOp(backingStorageKey, itemVersionGetter) }
}

/**
 * Converts a [CrdtOperation] from some referencable-typed operation to [BridgingOperation]
 * using the provided [value] as the full data referenced in the [CrdtSet]/[CrdtSingleton].
 */
@Suppress("UNCHECKED_CAST")
fun CrdtOperation.toBridgingOp(value: RawEntity?): BridgingOperation =
  when (this) {
    is CrdtSet.Operation<*> ->
      (this as CrdtSet.Operation<RawReference>).setToBridgingOp(value)
    is CrdtSingleton.Operation<*> ->
      (this as CrdtSingleton.Operation<RawReference>).singletonToBridgingOp(value)
    else -> throw CrdtException("Unsupported raw entity operation")
  }

/**
 * Bridges the gap between a [RefModeStoreOp] and the appropriate [RawReference]-based collection
 * operation.
 */
suspend fun RefModeStoreOp.toBridgingOp(
  backingStorageKey: StorageKey,
  // Callback which returns the version of the data being referenced from the acking store.
  itemVersionGetter: suspend (RawEntity) -> VersionMap
): BridgingOperation {
  return when (this) {
    is RefModeStoreOp.SingletonUpdate -> {
      val reference = value.toReference(backingStorageKey, itemVersionGetter(value))
      UpdateSingleton(
        value, reference, CrdtSingleton.Operation.Update(actor, versionMap, reference), this
      )
    }
    is RefModeStoreOp.SingletonClear -> {
      ClearSingleton(CrdtSingleton.Operation.Clear(actor, versionMap), this)
    }
    is RefModeStoreOp.SetAdd -> {
      val reference = added.toReference(backingStorageKey, itemVersionGetter(added))
      AddToSet(added, reference, CrdtSet.Operation.Add(actor, versionMap, reference), this)
    }
    is RefModeStoreOp.SetRemove -> {
      RemoveFromSet(removed, CrdtSet.Operation.Remove(actor, versionMap, removed), this)
    }
    is RefModeStoreOp.SetClear -> {
      ClearSet(CrdtSet.Operation.Clear(actor, versionMap), this)
    }
    else -> throw CrdtException("Unsupported operation: $this")
  }
}

/**
 * Bridges the gap between a [RawReference]-based [CrdtSingleton.Operation] and a [RefModeStoreOp],
 * using the provided [newValue] as the [RawEntity].
 */
private fun CrdtSet.Operation<RawReference>.setToBridgingOp(
  newValue: RawEntity?
): BridgingOperation = when (this) {
  is CrdtSet.Operation.Add ->
    AddToSet(
      newValue,
      added,
      this,
      RefModeStoreOp.SetAdd(actor, versionMap, requireNotNull(newValue))
    )
  is CrdtSet.Operation.Remove ->
    RemoveFromSet(
      removed,
      this,
      RefModeStoreOp.SetRemove(actor, versionMap, removed)
    )
  is CrdtSet.Operation.Clear -> ClearSet(this, RefModeStoreOp.SetClear(actor, versionMap))
  is CrdtSet.Operation.FastForward ->
    throw CrdtException("Unsupported reference-mode operation: FastForward.")
}

/**
 * Bridges the gap between a [RawReference]-based [CrdtSingleton.Operation] and a [RefModeStoreOp],
 * using the provided [newValue] as the [RawEntity].
 */
private fun CrdtSingleton.Operation<RawReference>.singletonToBridgingOp(
  newValue: RawEntity?
): BridgingOperation = when (this) {
  is CrdtSingleton.Operation.Update ->
    UpdateSingleton(
      newValue,
      value,
      this,
      RefModeStoreOp.SingletonUpdate(actor, versionMap, requireNotNull(newValue))
    )
  is CrdtSingleton.Operation.Clear ->
    ClearSingleton(this, RefModeStoreOp.SingletonClear(actor, versionMap))
}
