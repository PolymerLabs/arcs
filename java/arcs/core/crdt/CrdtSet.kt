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

@file:Suppress("RemoveRedundantQualifierName")

package arcs.core.crdt

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtChange.Operations
import arcs.core.crdt.CrdtSet.Data
import arcs.core.data.util.ReferencablePrimitive

/**
 * A [CrdtModel] capable of managing a set of items [T].
 *
 * The implementation is based on the optimized OR-Set as described in:
 *
 * Annette Bieniusa, Marek Zawirski, Nuno Preguiça, Marc Shapiro,
 * Carlos Baquero, Valter Balegas, Sérgio Duarte,
 * "An Optimized Conflict-free Replicated Set" (2012)
 *
 * https://arxiv.org/abs/1210.3368
 */
class CrdtSet<T : Referencable>(
  /** Initial data. */
  /* internal */ var _data: Data<T> = DataImpl()
) : CrdtModel<Data<T>, CrdtSet.IOperation<T>, Set<T>> {

  override val versionMap: VersionMap
    get() = _data.versionMap.copy()
  override val data: Data<T>
    get() = _data.copy()

  override val consumerView: Set<T>
    get() = HashSet<T>().apply { addAll(_data.values.values.map { it.value }) }

  override fun merge(other: Data<T>): MergeChanges<Data<T>, IOperation<T>> {
    val oldVersionMap = _data.versionMap.copy()
    val newVersionMap = _data.versionMap mergeWith other.versionMap
    val mergedData = DataImpl<T>(newVersionMap)
    val fastForwardOp = Operation.FastForward<T>(other.versionMap, newVersionMap)

    other.values.values.forEach { (otherVersion: VersionMap, otherValue: T) ->
      val id = otherValue.id
      val myEntry = _data.values[id]

      if (myEntry != null) {
        val (myVersion, myValue) = myEntry

        if (myVersion == otherVersion) {
          // Both models have the same value at the same version. Add it to the merge.
          mergedData.values[id] = myEntry
        } else {
          // Models have different versions for the value with the same id.
          // Merge the versions, and update the value to whichever is newer.
          DataValue(
            myVersion mergeWith otherVersion,
            if (myVersion dominates otherVersion) myValue
            else if (otherVersion dominates myVersion) otherValue
            else {
              // Concurrent changes. Pick value with smaller hashcode.
              if (myValue.hashCode() <= otherValue.hashCode()) myValue
              else otherValue
            }
          ).also {
            mergedData.values[id] = it
            fastForwardOp.added += it
          }
        }
      } else if (_data.versionMap dominates otherVersion) {
        // Value was deleted by this model.
        fastForwardOp.removed += otherValue
      } else {
        // Value was added by the other model.
        mergedData.values[id] = DataValue(otherVersion, otherValue)
      }
    }

    _data.values.forEach { (id, myEntry) ->
      if (id !in other.values && other.versionMap doesNotDominate myEntry.versionMap) {
        // Value was added by this model.
        mergedData.values[id] = myEntry
        fastForwardOp.added += myEntry
      }
    }

    val otherOperations = if (
      fastForwardOp.added.isNotEmpty() ||
      fastForwardOp.removed.isNotEmpty() ||
      oldVersionMap doesNotDominate newVersionMap
    ) {
      Operations<Data<T>, IOperation<T>>(fastForwardOp.simplify().toMutableList())
    } else {
      Operations<Data<T>, IOperation<T>>(mutableListOf())
    }

    val myChange = if (mergedData == this._data) {
      Operations<Data<T>, IOperation<T>>(mutableListOf())
    } else {
      CrdtChange.Data<Data<T>, IOperation<T>>(mergedData)
    }

    this._data = mergedData

    return MergeChanges(
      modelChange = myChange, otherChange = otherOperations
    )
  }

  override fun applyOperation(op: IOperation<T>): Boolean = op.applyTo(_data)

  /** Checks whether or not a given [Operation] will succeed. */
  @Suppress("unused")
  fun canApplyOperation(op: Operation<T>): Boolean = op.applyTo(_data, isDryRun = true)

  /** Makes a deep copy of this [CrdtSet]. */
  /* internal */ fun copy(): CrdtSet<T> = CrdtSet(
    DataImpl(_data.versionMap.copy(), HashMap(_data.values))
  )

  override fun toString(): String = "CrdtSet($_data)"

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (other == null) return false
    if (this::class != other::class) return false

    other as CrdtSet<*>

    if (_data != other._data) return false

    return true
  }

  override fun hashCode(): Int = _data.hashCode()

  /** Abstract representation of the data managed by [CrdtSet]. */
  interface Data<T : Referencable> : CrdtData {
    val values: MutableMap<ReferenceId, DataValue<T>>

    /** Constructs a deep copy of this [Data]. */
    fun copy(): Data<T>
  }

  /** Representation of the data managed by [CrdtSet]. */
  data class DataImpl<T : Referencable>(
    override var versionMap: VersionMap = VersionMap(),
    /** Map of values by their [ReferenceId]s. */
    override val values: MutableMap<ReferenceId, DataValue<T>> = mutableMapOf()
  ) : Data<T> {
    override fun copy() = DataImpl(
      versionMap = VersionMap(versionMap),
      values = HashMap(values)
    )

    override fun toString(): String =
      "CrdtSet.Data(versionMap=$versionMap, values=${values.toStringRepr()})"

    private fun <T : Referencable> Map<ReferenceId, DataValue<T>>.toStringRepr(): String =
      entries.joinToString(prefix = "{", postfix = "}") { (id, value) ->
        "${ReferencablePrimitive.unwrap(id) ?: id}=$value"
      }
  }

  /** A particular datum within a [CrdtSet]. */
  data class DataValue<T : Referencable>(
    /** The 'time' when the item was added. */
    val versionMap: VersionMap,
    /** The actual value of the datum. */
    val value: T
  ) {
    override fun toString(): String = "$value@Version$versionMap"
  }

  /** Generic Operation applicable to [CrdtSet]. */
  interface IOperation<T : Referencable> : CrdtOperationAtTime {
    /** Performs the operation on the specified [DataImpl] instance. */
    fun applyTo(data: Data<T>, isDryRun: Boolean = false): Boolean
  }

  /** Operations which can be performed on a [CrdtSet]. */
  sealed class Operation<T : Referencable> : IOperation<T> {
    /**
     * Represents an addition of a new item into a [CrdtSet] and returns whether or not the
     * operation could be applied.
     */
    open class Add<T : Referencable>(
      val actor: Actor,
      override val versionMap: VersionMap,
      val added: T
    ) : Operation<T>() {
      override fun applyTo(data: Data<T>, isDryRun: Boolean): Boolean {
        // Only accept an add if it is immediately consecutive to the versionMap for that actor.
        if (versionMap[actor] != data.versionMap[actor] + 1) return false

        // No need to edit actual data during a dry run.
        if (isDryRun) return true

        data.versionMap[actor] = versionMap[actor]
        val previousVersion = data.values[added.id]?.versionMap ?: VersionMap()
        data.values[added.id] = DataValue(versionMap mergeWith previousVersion, added)
        return true
      }

      override fun equals(other: Any?): Boolean =
        other is Add<*> &&
          other.versionMap == versionMap &&
          other.actor == actor &&
          other.added == added

      override fun hashCode(): Int = toString().hashCode()

      override fun toString(): String = "CrdtSet.Operation.Add($versionMap, $actor, $added)"
    }

    /** Represents the removal of an item from a [CrdtSet]. */
    open class Remove<T : Referencable>(
      val actor: Actor,
      override val versionMap: VersionMap,
      val removed: ReferenceId
    ) : Operation<T>() {
      override fun applyTo(data: Data<T>, isDryRun: Boolean): Boolean {
        // Can't remove an item that doesn't exist.
        val existingDatum = data.values[removed] ?: return false

        // Ensure the remove op doesn't change the versionMap value.
        if (versionMap[actor] != data.versionMap[actor]) return false

        // Can't remove the item unless the versionMap value dominates that of the item already
        // in the set.
        if (versionMap doesNotDominate existingDatum.versionMap) return false

        // No need to edit actual data during a dry run.
        if (isDryRun) return true

        data.versionMap[actor] = versionMap[actor]
        data.values.remove(removed)
        return true
      }

      override fun equals(other: Any?): Boolean =
        other is Remove<*> &&
          other.versionMap == versionMap &&
          other.actor == actor &&
          other.removed == removed

      override fun hashCode(): Int = toString().hashCode()

      override fun toString(): String = "CrdtSet.Operation.Remove($versionMap, $actor, $removed)"
    }

    /**
     * Represents the removal of all items from a [CrdtSet]. If an empty [versionMap] is given, all
     * items in the set are removed unconditionally; otherwise, only those items dominated by
     * the versionMap are removed. This allow actors with write-only access to a model to operate
     * without needing to synchronise the versionMap data from other actors.
     */
    open class Clear<T : Referencable>(
      val actor: Actor,
      override val versionMap: VersionMap
    ) : Operation<T>() {
      override fun applyTo(data: Data<T>, isDryRun: Boolean): Boolean {
        if (isDryRun) return true

        if (versionMap.isEmpty()) {
          data.values.clear()
          return true
        }
        if (versionMap[actor] == data.versionMap[actor]) {
          data.values.entries.removeAll { versionMap dominates it.value.versionMap }
          return true
        }
        return false
      }

      override fun equals(other: Any?): Boolean =
        other is Clear<*> &&
          other.versionMap == versionMap &&
          other.actor == actor

      override fun hashCode(): Int = toString().hashCode()

      override fun toString(): String = "CrdtSet.Operation.Clear($versionMap, $actor)"
    }

    /** Represents a batch operation to catch one [CrdtSet] up with another. */
    data class FastForward<T : Referencable>(
      val oldVersionMap: VersionMap,
      val newVersionMap: VersionMap,
      val added: MutableList<DataValue<T>> = mutableListOf(),
      val removed: MutableList<T> = mutableListOf()
    ) : Operation<T>() {
      override val versionMap: VersionMap = newVersionMap

      override fun applyTo(data: Data<T>, isDryRun: Boolean): Boolean {
        // Can't fast-forward when current data's versionMap is behind oldVersionMap.
        if (data.versionMap doesNotDominate oldVersionMap) return false

        // If the current data already knows about everything in the fast-forward op, we
        // don't have to do anything.
        if (data.versionMap dominates newVersionMap) return true

        // No need to edit actual data during a dry run.
        if (isDryRun) return true

        added.forEach { (addedVersionMap: VersionMap, addedValue: T) ->
          val existingValue = data.values[addedValue.id]
          if (existingValue != null) {
            data.values[addedValue.id] =
              DataValue(
                addedVersionMap mergeWith existingValue.versionMap, existingValue.value
              )
          } else if (data.versionMap doesNotDominate addedVersionMap) {
            data.values[addedValue.id] = DataValue(addedVersionMap, addedValue)
          }
        }

        removed.forEach { removedValue: T ->
          val existingValue = data.values[removedValue.id]
          if (existingValue != null && newVersionMap dominates existingValue.versionMap) {
            data.values.remove(removedValue.id)
          }
        }

        data.versionMap = data.versionMap mergeWith newVersionMap
        return true
      }

      /**
       * Simplifies a [FastForward] operation, if possible.
       *
       * Converts a simple fast-forward operation into a sequence of regular ops.
       *
       * **Note:** Currently only supports converting add ops made by a single actor. Returns
       * a list containing this [FastForward] op if it could not simplify.
       */
      fun simplify(): List<Operation<T>> {
        // Remove ops can't be replayed in order.
        if (removed.isNotEmpty()) return listOf(this)

        if (added.isEmpty()) {
          if (oldVersionMap == newVersionMap) {
            // No added, no removed, and no clock changes: op should be empty.
            return emptyList()
          }
          // This is just a version bump, since there are no additions and no removals.
          return listOf(this)
        }

        // Can only return a simplified list of ops if all additions come from a single
        // actor.
        val versionDiff = newVersionMap - oldVersionMap
        if (versionDiff.size != 1) return listOf(this)
        val actor = versionDiff.actors.first()

        val sortedAdds = added.sortedBy { it.versionMap[actor] }
        var expectedVersion = oldVersionMap[actor]
        sortedAdds.forEach { (itemVersion: VersionMap, _) ->
          // The add op's version for the actor wasn't just an increment-by-one from the
          // previous version.
          if (++expectedVersion != itemVersion[actor]) return listOf(this)
        }

        val expectedVersionMap = VersionMap(oldVersionMap).also { it[actor] = expectedVersion }

        // If the final versionMap does not match an increment-by-one approach for each addition
        // for the actor, we can't simplify.
        if (expectedVersionMap != newVersionMap) return listOf(this)

        return added.map { Add(actor, it.versionMap, it.value) }
      }
    }
  }

  companion object {
    /** Creates a [CrdtSet] from pre-existing data. */
    fun <T : Referencable> createWithData(data: Data<T>) = CrdtSet(data)
  }
}
