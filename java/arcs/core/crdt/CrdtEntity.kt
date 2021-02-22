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

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtSet.Data as SetData
import arcs.core.crdt.CrdtSet.IOperation as ISetOp
import arcs.core.crdt.CrdtSet.Operation as SetOp
import arcs.core.crdt.CrdtSingleton.Data as SingletonData
import arcs.core.crdt.CrdtSingleton.IOperation as ISingletonOp
import arcs.core.crdt.CrdtSingleton.Operation as SingletonOp
import arcs.core.data.FieldName
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencablePrimitive

/**
 * A [CrdtModel] capable of managing a complex entity consisting of named [CrdtSingleton]s and named
 * [CrdtSet]s, each of which can manage various types of [Referencable] data.
 *
 * The only valid ways to build a [CrdtEntity] are:
 * 1. Build an empty one. [RawEntity] can describe the singleton and collection fields that
 *    exist on an entity without having any of those fields set; by using a [RawEntity] thus
 *    configured and calling [CrdtEntity.newWithEmptyEntity] one can construct an empty
 *    [CrdtEntity].
 * 2. From valid [CrdtEntity.Data]. This is currently performed in prod by constructing an empty
 *    [CrdtEntity] of the appropriate shape, and calling [merge] on it with the valid data.
 *    However, note that it's also valid to directly construct a [CrdtEntity] from Data.
 *
 * There's also [CrdtEntity.newAtVersionForTest] which takes a [VersionMap] and a [RawEntity].
 * Note that this will give all fields in the constructed [CrdtEntity] the same [VersionMap],
 * which is generally not what we would expect in production.
 */
class CrdtEntity(
  private var _data: Data = Data()
) : CrdtModel<CrdtEntity.Data, CrdtEntity.Operation, RawEntity> {
  override val versionMap: VersionMap
    get() = _data.versionMap.copy()
  override val data: Data
    get() = _data.copy()
  override val consumerView: RawEntity
    get() = data.toRawEntity()

  /**
   * Builds a [CrdtEntity] from a [RawEntity] with its clock starting at the given [VersionMap].
   */
  private constructor(
    versionMap: VersionMap,
    rawEntity: RawEntity,
    /**
     * Function to convert the [Referencable]s within [rawEntity] into [Reference] objects
     * needed by [CrdtEntity].
     */
    referenceBuilder: (Referencable) -> Reference = Reference.Companion::buildReference
  ) : this(Data(versionMap, rawEntity, referenceBuilder))

  override fun merge(other: Data): MergeChanges<Data, Operation> {
    /* ktlint-disable max-line-length */
    val singletonChanges =
      mutableMapOf<FieldName, MergeChanges<SingletonData<Reference>, ISingletonOp<Reference>>>()
    /* ktlint-enable max-line-length */
    val collectionChanges =
      mutableMapOf<FieldName, MergeChanges<SetData<Reference>, ISetOp<Reference>>>()

    var allOps = true

    _data.singletons.forEach { (fieldName, singleton) ->
      val otherSingleton = other.singletons[fieldName]
      if (otherSingleton != null) {
        singletonChanges[fieldName] = singleton.merge(otherSingleton.data)
      }
      if (singletonChanges[fieldName]?.modelChange is CrdtChange.Data ||
        singletonChanges[fieldName]?.otherChange is CrdtChange.Data
      ) {
        allOps = false
      }
    }
    _data.collections.forEach { (fieldName, collection) ->
      val otherCollection = other.collections[fieldName]
      if (otherCollection != null) {
        collectionChanges[fieldName] = collection.merge(otherCollection.data)
      }
      if (collectionChanges[fieldName]?.modelChange is CrdtChange.Data ||
        collectionChanges[fieldName]?.otherChange is CrdtChange.Data
      ) {
        allOps = false
      }
    }

    if (_data.creationTimestamp != other.creationTimestamp) {
      allOps = false
      if (_data.creationTimestamp == RawEntity.UNINITIALIZED_TIMESTAMP) {
        _data.creationTimestamp = other.creationTimestamp
      } else if (other.creationTimestamp != RawEntity.UNINITIALIZED_TIMESTAMP) {
        // Two different values, take minimum.
        _data.creationTimestamp = minOf(_data.creationTimestamp, other.creationTimestamp)
      }
    }
    if (_data.expirationTimestamp != other.expirationTimestamp) {
      allOps = false
      if (_data.expirationTimestamp == RawEntity.UNINITIALIZED_TIMESTAMP) {
        _data.expirationTimestamp = other.expirationTimestamp
      } else if (other.expirationTimestamp != RawEntity.UNINITIALIZED_TIMESTAMP) {
        // Two different values, take minimum.
        _data.expirationTimestamp =
          minOf(_data.expirationTimestamp, other.expirationTimestamp)
      }
    }
    if (_data.id != other.id) {
      allOps = false
      if (_data.id == RawEntity.NO_REFERENCE_ID) {
        _data.id = other.id
      } else if (other.id != RawEntity.NO_REFERENCE_ID) {
        // Two different ids, this cannot be as this crdts are keyed by id in the backing store.
        throw CrdtException("Found two different values for id, this should be impossible.")
      }
    }

    val oldVersionMap = _data.versionMap.copy()
    _data.versionMap = _data.versionMap mergeWith other.versionMap

    if (oldVersionMap == other.versionMap) {
      @Suppress("RemoveExplicitTypeArguments")
      return MergeChanges(
        CrdtChange.Operations(mutableListOf<Operation>()),
        CrdtChange.Operations(mutableListOf<Operation>())
      )
    }

    return if (allOps) {
      val modelOps = mutableListOf<Operation>()
      val otherOps = mutableListOf<Operation>()

      // Convert all of our CrdtSingleton.Operations and CrdtSet.Operations into
      // CrdtEntity.Operations.

      singletonChanges.forEach { (fieldName, mergeChanges) ->
        modelOps += when (val changes = mergeChanges.modelChange) {
          is CrdtChange.Operations -> changes.ops.map { it.toEntityOp(fieldName) }
          // This shouldn't happen, but strong typing forces us to check.
          else -> throw CrdtException("Found a Data change when Operations expected")
        }
        otherOps += when (val changes = mergeChanges.otherChange) {
          is CrdtChange.Operations -> changes.ops.map { it.toEntityOp(fieldName) }
          // This shouldn't happen, but strong typing forces us to check.
          else -> throw CrdtException("Found a Data change when Operations expected")
        }
      }

      collectionChanges.forEach { (fieldName, mergeChanges) ->
        modelOps += when (val changes = mergeChanges.modelChange) {
          is CrdtChange.Operations -> changes.ops.map { it.toEntityOp(fieldName) }
          // This shouldn't happen, but strong typing forces us to check.
          else -> throw CrdtException("Found a Data change when Operations expected")
        }
        otherOps += when (val changes = mergeChanges.otherChange) {
          is CrdtChange.Operations -> changes.ops.map { it.toEntityOp(fieldName) }
          // This shouldn't happen, but strong typing forces us to check.
          else -> throw CrdtException("Found a Data change when Operations expected")
        }
      }

      MergeChanges(
        modelChange = CrdtChange.Operations(modelOps),
        otherChange = CrdtChange.Operations(otherOps)
      )
    } else {
      val resultData = data // call `data` only once, since it's nontrivial to copy.

      // Check if there are no other changes.
      val otherChangesEmpty =
        singletonChanges.values.all { it.otherChange.isEmpty() } &&
          collectionChanges.values.all { it.otherChange.isEmpty() }
      val otherChange: CrdtChange<Data, Operation> = if (otherChangesEmpty) {
        CrdtChange.Operations(mutableListOf())
      } else {
        CrdtChange.Data(resultData)
      }

      if (oldVersionMap == _data.versionMap) {
        return MergeChanges(
          modelChange = CrdtChange.Operations(mutableListOf<Operation>()),
          otherChange = otherChange
        )
      }
      MergeChanges(
        modelChange = CrdtChange.Data(resultData),
        otherChange = otherChange
      )
    }
  }

  override fun applyOperation(op: Operation): Boolean {
    return when (op) {
      is Operation.SetSingleton ->
        _data.singletons[op.field]?.applyOperation(op.toSingletonOp())
      is Operation.ClearSingleton ->
        _data.singletons[op.field]?.applyOperation(op.toSingletonOp())
      is Operation.AddToSet ->
        _data.collections[op.field]?.applyOperation(op.toSetOp())
      is Operation.RemoveFromSet ->
        _data.collections[op.field]?.applyOperation(op.toSetOp())
      is Operation.ClearAll -> {
        _data.singletons.values.forEach {
          it.applyOperation(CrdtSingleton.Operation.Clear(op.actor, versionMap))
        }
        _data.collections.values.forEach {
          it.applyOperation(CrdtSet.Operation.Clear(op.actor, versionMap))
        }
        _data.creationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP
        _data.expirationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP
        return true
      }
    }?.also { success ->
      if (success) {
        _data.versionMap = _data.versionMap mergeWith op.versionMap
      }
    } ?: throw CrdtException("Invalid op: $op.")
  }

  /** Defines the type of data managed by [CrdtEntity] for its singletons and collections. */
  interface Reference : Referencable {
    companion object {
      /** Simple converter from [Referencable] to [Reference]. */
      fun buildReference(referencable: Referencable): Reference =
        ReferenceImpl(referencable.id)

      fun wrapReferencable(referencable: Referencable): Reference =
        WrappedReferencable(referencable)
    }
  }

  data class WrappedReferencable(val referencable: Referencable) : Reference {
    override fun unwrap(): Referencable = referencable

    override val id: String
      get() = referencable.id
  }

  /** Minimal [Reference] for contents of a singletons/collections in [Data]. */
  data class ReferenceImpl(override val id: ReferenceId) : Reference {
    override fun unwrap(): Referencable =
      ReferencablePrimitive.unwrap(id) ?: this

    override fun toString(): String = when (val deref = unwrap()) {
      this -> "Reference($id)"
      else -> "Reference($deref)"
    }
  }

  /** Data contained within a [CrdtEntity]. */
  data class Data(
    /** Master version of the entity. */
    override var versionMap: VersionMap = VersionMap(),
    /** Singleton fields. */
    val singletons: Map<FieldName, CrdtSingleton<Reference>> = emptyMap(),
    /** Collection fields. */
    val collections: Map<FieldName, CrdtSet<Reference>> = emptyMap(),
    var creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
    var expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
    var id: ReferenceId = RawEntity.NO_REFERENCE_ID
  ) : CrdtData {
    /** Builds a [CrdtEntity.Data] object from an initial version and a [RawEntity]. */
    constructor(
      versionMap: VersionMap,
      rawEntity: RawEntity,
      referenceBuilder: (Referencable) -> Reference
    ) : this(
      versionMap,
      rawEntity.buildCrdtSingletonMap({ versionMap }, referenceBuilder),
      rawEntity.buildCrdtSetMap({ versionMap }, referenceBuilder),
      rawEntity.creationTimestamp,
      rawEntity.expirationTimestamp,
      rawEntity.id
    )

    constructor(
      rawEntity: RawEntity,
      entityVersion: VersionMap,
      versionProvider: (FieldName) -> VersionMap,
      referenceBuilder: (Referencable) -> Reference
    ) : this(
      entityVersion,
      rawEntity.buildCrdtSingletonMap(versionProvider, referenceBuilder),
      rawEntity.buildCrdtSetMap(versionProvider, referenceBuilder),
      rawEntity.creationTimestamp,
      rawEntity.expirationTimestamp,
      rawEntity.id
    )

    fun toRawEntity() = RawEntity(
      id,
      singletons.mapValues { it.value.consumerView?.unwrap() },
      collections.mapValues {
        it.value.consumerView.map { item -> item.unwrap() }.toSet()
      },
      creationTimestamp,
      expirationTimestamp
    )

    fun toRawEntity(refId: ReferenceId) = RawEntity(
      refId,
      singletons.mapValues { it.value.consumerView?.unwrap() },
      collections.mapValues {
        it.value.consumerView.map { item -> item.unwrap() }.toSet()
      },
      creationTimestamp,
      expirationTimestamp
    )

    /** Makes a deep copy of this [CrdtEntity.Data] object. */
    // We can't rely on the Data Class's .copy(param=val,..) because it doesn't deep-copy the
    // inners, unfortunately.
    /* internal */ fun copy(): Data = Data(
      versionMap.copy(),
      HashMap(singletons.mapValues { it.value.copy() }),
      HashMap(collections.mapValues { it.value.copy() }),
      creationTimestamp,
      expirationTimestamp,
      id
    )

    companion object {
      private fun RawEntity.buildCrdtSingletonMap(
        versionProvider: (FieldName) -> VersionMap,
        referenceBuilder: (Referencable) -> Reference
      ): Map<FieldName, CrdtSingleton<Reference>> = singletons.mapValues { entry ->
        CrdtSingleton(
          versionProvider(entry.key).copy(),
          entry.value?.let { referenceBuilder(it) }
        )
      }

      @Suppress("UNCHECKED_CAST")
      private fun RawEntity.buildCrdtSetMap(
        versionProvider: (FieldName) -> VersionMap,
        referenceBuilder: (Referencable) -> Reference
      ): Map<FieldName, CrdtSet<Reference>> = collections.mapValues { entry ->
        val version = versionProvider(entry.key).copy()
        CrdtSet(
          CrdtSet.DataImpl(
            version,
            entry.value.map { CrdtSet.DataValue(version.copy(), referenceBuilder(it)) }
              .associateBy { it.value.id }
              .toMutableMap()
          )
        )
      }
    }
  }

  /** Valid [CrdtOperation]s for [CrdtEntity]. */
  sealed class Operation(
    open val actor: Actor,
    override val versionMap: VersionMap
  ) : CrdtOperation {
    /**
     * Represents an [actor] having set the value of a member [CrdtSingleton] [field] to the
     * specified [value] at the time denoted by [versionMap].
     */
    data class SetSingleton(
      override val actor: Actor,
      override val versionMap: VersionMap,
      val field: FieldName,
      val value: Reference
    ) : Operation(actor, versionMap) {
      /**
       * Converts the [CrdtEntity.Operation] into its corresponding [CrdtSingleton.Operation].
       */
      fun toSingletonOp(): SingletonOp.Update<Reference> =
        CrdtSingleton.Operation.Update(actor, versionMap, value)
    }

    /**
     * Represents an [actor] having cleared the value from a member [CrdtSingleton] [field] to
     * at the time denoted by [versionMap].
     */
    data class ClearSingleton(
      override val actor: Actor,
      override val versionMap: VersionMap,
      val field: FieldName
    ) : Operation(actor, versionMap) {
      /**
       * Converts the [CrdtEntity.Operation] into its corresponding [CrdtSingleton.Operation].
       */
      fun toSingletonOp(): SingletonOp.Clear<Reference> =
        CrdtSingleton.Operation.Clear(actor, versionMap)
    }

    /**
     * Represents an [actor] having added a [Reference] to a member [CrdtSet] [field] at the
     * time denoted by [versionMap].
     */
    data class AddToSet(
      override val actor: Actor,
      override val versionMap: VersionMap,
      val field: FieldName,
      val added: Reference
    ) : Operation(actor, versionMap) {
      /**
       * Converts the [CrdtEntity.Operation] into its corresponding [CrdtSet.Operation].
       */
      fun toSetOp(): SetOp.Add<Reference> = CrdtSet.Operation.Add(actor, versionMap, added)
    }

    /**
     * Represents an [actor] having removed the a value from a member [CrdtSet] [field] at the
     * time denoted by [versionMap].
     */
    data class RemoveFromSet(
      override val actor: Actor,
      override val versionMap: VersionMap,
      val field: FieldName,
      val removed: ReferenceId
    ) : Operation(actor, versionMap) {
      /**
       * Converts the [CrdtEntity.Operation] into its corresponding [CrdtSet.Operation].
       */
      fun toSetOp(): SetOp.Remove<Reference> = CrdtSet.Operation.Remove(actor, versionMap, removed)
    }

    data class ClearAll(
      override val actor: Actor,
      override val versionMap: VersionMap
    ) : Operation(actor, versionMap)
  }

  companion object {
    /**
     * Builds a [CrdtEntity] from a [RawEntity] with its clock starting at the given [VersionMap].
     *
     * This is probably not what you want to do in production; all fields end up being given
     * the version provided by the [VersionMap].
     */
    fun newAtVersionForTest(versionMap: VersionMap, rawEntity: RawEntity): CrdtEntity {
      return CrdtEntity(versionMap, rawEntity)
    }

    /**
     * Builds a [CrdtEntity] with no version map information. This is only intended to be used
     * with [RawEntity]s that have no field values set!
     */
    fun newWithEmptyEntity(rawEntity: RawEntity): CrdtEntity {
      return CrdtEntity(VersionMap(), rawEntity)
    }
  }
}

/** Converts the [RawEntity] into a [CrdtEntity.Data] model, at the given version. */
fun RawEntity.toCrdtEntityData(
  versionMap: VersionMap,
  referenceBuilder: (Referencable) -> CrdtEntity.Reference = { CrdtEntity.ReferenceImpl(it.id) }
): CrdtEntity.Data = CrdtEntity.Data(versionMap.copy(), this, referenceBuilder)

/** Visible for testing. */
fun ISingletonOp<CrdtEntity.Reference>.toEntityOp(
  fieldName: FieldName
): CrdtEntity.Operation = when (this) {
  is SingletonOp.Update -> CrdtEntity.Operation.SetSingleton(actor, versionMap, fieldName, value)
  is SingletonOp.Clear -> CrdtEntity.Operation.ClearSingleton(actor, versionMap, fieldName)
  else -> throw CrdtException("Invalid operation")
}

/** Visible for testing. */
fun ISetOp<CrdtEntity.Reference>.toEntityOp(
  fieldName: FieldName
): CrdtEntity.Operation = when (this) {
  is SetOp.Add -> CrdtEntity.Operation.AddToSet(actor, versionMap, fieldName, added)
  is SetOp.Remove -> CrdtEntity.Operation.RemoveFromSet(actor, versionMap, fieldName, removed)
  else -> throw CrdtException("Cannot convert FastForward or Clear to CrdtEntity Operation")
}
