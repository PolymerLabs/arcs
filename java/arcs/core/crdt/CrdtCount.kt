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

package arcs.core.crdt

/** A [CrdtModel] capable of managing an increasing [Int] value. */
class CrdtCount : CrdtModel<CrdtCount.Data, CrdtCount.Operation, Int> {
  private var _data: Data = Data()
  override val versionMap: VersionMap
    get() = _data.versionMap.copy()
  override val data: Data
    get() = _data.copy(values = HashMap(_data.values), versionMap = _data.versionMap.copy())

  override val consumerView: Int
    get() = _data.values.values.sum()

  fun forActor(actor: Actor) = Scoped(actor)

  override fun merge(other: Data): MergeChanges<Data, Operation> {
    val myChanges = CrdtChange.Operations<Data, Operation>()
    val otherChanges = CrdtChange.Operations<Data, Operation>()

    other.values.forEach { (actor, otherValue) ->
      val myValue = _data.values[actor] ?: 0
      val myVersion = _data.versionMap[actor]
      val otherVersion = other.versionMap[actor]

      if (myValue > otherValue) {
        if (otherVersion >= myVersion) {
          throw CrdtException("Divergent versions encountered when merging CrdtCount models")
        }

        otherChanges +=
          Operation.MultiIncrement(actor, VersionMap(actor to myVersion), myValue - otherValue)
      } else if (otherValue > myValue) {
        if (myVersion >= otherVersion) {
          throw CrdtException("Divergent versions encountered when merging CrdtCount models")
        }

        myChanges +=
          Operation.MultiIncrement(actor, VersionMap(actor to otherVersion), otherValue - myValue)
        _data.values[actor] = otherValue
        _data.versionMap[actor] = otherVersion
      }
    }

    _data.values.forEach { (actor, myValue) ->
      if (actor in other.values) return@forEach
      if (actor in other.versionMap) {
        throw CrdtException("CrdtCount model has version but no value for actor: $actor")
      }

      otherChanges +=
        Operation.MultiIncrement(actor, VersionMap(actor to _data.versionMap[actor]), myValue)
    }
    return MergeChanges(myChanges, otherChanges)
  }

  override fun applyOperation(op: Operation): Boolean {
    // Only accept an operation if it is immediately consecutive to the versionMap for that actor.
    val opVersion = op.versionMap[op.actor]
    if (opVersion != _data.versionMap[op.actor] + 1) return false

    val delta = when (op) {
      is Operation.Increment -> 1
      is Operation.MultiIncrement -> op.delta
    }
    _data.values[op.actor] = (_data.values[op.actor] ?: 0) + delta
    _data.versionMap[op.actor] = opVersion
    return true
  }

  /** Scoped access to this [CrdtCount], where all ops will be marked as performed by [actor]. */
  inner class Scoped(private val actor: Actor) {
    operator fun plusAssign(delta: Int) {
      // [versionMap] getter makes a copy of _data.versionMap, so it's safe to increment in place.
      applyOperation(
        Operation.MultiIncrement(actor, versionMap.increment(actor), delta)
      )
    }
  }

  /** Internal representation of the count information. */
  data class Data(
    /** Increments seen from each actor. */
    val values: MutableMap<Actor, Int> = mutableMapOf(),
    /** Versions at each actor. */
    override var versionMap: VersionMap = VersionMap()
  ) : CrdtData

  /** Operation which can be performed on a [CrdtCount]. */
  sealed class Operation(open val actor: Actor) : CrdtOperation {
    /**
     * Increments the value by 1 for the given [actor] when going from one version to another
     * for that actor.
     */
    data class Increment(
      override val actor: Actor,
      override val versionMap: VersionMap
    ) : Operation(actor)

    /**
     * Increments the value by some positive integer [delta] for the given [actor] when going
     * from one version to another for that actor.
     */
    data class MultiIncrement(
      override val actor: Actor,
      override val versionMap: VersionMap,
      val delta: Int
    ) : Operation(actor) {
      init {
        require(delta > 0)
      }
    }
  }
}
