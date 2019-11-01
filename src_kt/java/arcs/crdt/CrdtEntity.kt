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

package arcs.crdt

import arcs.common.Referencable
import arcs.common.ReferenceId
import arcs.crdt.CrdtSet.Data as SetData
import arcs.crdt.CrdtSet.Operation as SetOp
import arcs.crdt.CrdtSingleton.Data as SingletonData
import arcs.crdt.CrdtSingleton.Operation as SingletonOp
import arcs.crdt.internal.Actor
import arcs.crdt.internal.VersionMap
import arcs.data.FieldName
import arcs.data.RawEntity

/**
 * A [CrdtModel] capable of managing a complex entity consisting of named [CrdtSingleton]s and named
 * [CrdtSet]s, each of which can manage various types of [Referencable] data.
 */
class CrdtEntity(
    private var _data: Data = Data()
) : CrdtModel<CrdtEntity.Data, CrdtEntity.Operation, RawEntity> {
    override val data: Data
        get() = _data.copy()
    override val consumerView: RawEntity
        get() = data.toRawEntity()

    /**
     * Builds a [CrdtEntity] from a [RawEntity] with its clock starting at the given [VersionMap].
     */
    constructor(versionMap: VersionMap, rawEntity: RawEntity) : this(Data(versionMap, rawEntity))

    override fun merge(other: Data): MergeChanges<Data, Operation> {
        val singletonChanges =
            mutableMapOf<FieldName, MergeChanges<SingletonData<Reference>, SingletonOp<Reference>>>()
        val collectionChanges =
            mutableMapOf<FieldName, MergeChanges<SetData<Reference>, SetOp<Reference>>>()

        var allOps = true

        _data.singletons.forEach { (fieldName, singleton) ->
            val otherSingleton = other.singletons[fieldName]
            if (otherSingleton != null) {
                singletonChanges[fieldName] = singleton.merge(otherSingleton.data)
            }
            if (singletonChanges[fieldName]?.modelChange is CrdtChange.Data
                || singletonChanges[fieldName]?.otherChange is CrdtChange.Data) {
                allOps = false
            }
        }
        _data.collections.forEach { (fieldName, collection) ->
            val otherCollection = other.collections[fieldName]
            if (otherCollection != null) {
                collectionChanges[fieldName] = collection.merge(otherCollection.data)
            }
            if (collectionChanges[fieldName]?.modelChange is CrdtChange.Data
                || collectionChanges[fieldName]?.otherChange is CrdtChange.Data) {
                allOps = false
            }
        }
        _data.versionMap = _data.versionMap mergeWith other.versionMap

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
            MergeChanges(
                modelChange = CrdtChange.Data(resultData),
                otherChange = CrdtChange.Data(resultData)
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
        }?.also { success ->
            if (success) {
                _data.versionMap = _data.versionMap mergeWith op.clock
            }
        } ?: throw CrdtException("Invalid field: ${op.field} does not exist")
    }

    override fun updateData(newData: Data) {
        _data = newData.copy()
    }

    private fun SingletonOp<Reference>.toEntityOp(fieldName: FieldName): Operation = when(this) {
        is SingletonOp.Update -> Operation.SetSingleton(actor, clock, fieldName, value)
        is SingletonOp.Clear -> Operation.ClearSingleton(actor, clock, fieldName)
    }

    private fun SetOp<Reference>.toEntityOp(fieldName: FieldName): Operation = when (this) {
        is SetOp.Add -> Operation.AddToSet(actor, clock, fieldName, added)
        is SetOp.Remove -> Operation.RemoveFromSet(actor, clock, fieldName, removed)
        is SetOp.FastForward ->
            throw CrdtException("Cannot convert FastForward to CrdtEntity Operation")
    }

    /** Minimal [Referencable] for contents of a singletons/collections in [Data]. */
    data class Reference(override val id: ReferenceId) : Referencable

    /** Data contained within a [CrdtEntity]. */
    data class Data(
        /** Master version of the entity. */
        override var versionMap: VersionMap = VersionMap(),
        /** Singleton fields. */
        val singletons: Map<FieldName, CrdtSingleton<Reference>> = emptyMap(),
        /** Collection fields. */
        val collections: Map<FieldName, CrdtSet<Reference>> = emptyMap()
    ) : CrdtData {
        /** Builds a [CrdtEntity.Data] object from an initial version and a [RawEntity]. */
        constructor(versionMap: VersionMap, rawEntity: RawEntity) : this(
            versionMap,
            rawEntity.buildCrdtSingletonMap(versionMap),
            rawEntity.buildCrdtSetMap(versionMap)
        )

        internal fun toRawEntity() = RawEntity(
            singletons.mapValues { it.value.consumerView },
            collections.mapValues { it.value.consumerView }
        )

        /** Makes a deep copy of this [CrdtEntity.Data] object. */
        // We can't rely on the Data Class's .copy(param=val,..) because it doesn't deep-copy the
        // inners, unfortunately.
        internal fun copy(): Data = Data(
            versionMap.copy(),
            HashMap(singletons.mapValues { it.value.copy() }),
            HashMap(collections.mapValues { it.value.copy() })
        )

        companion object {
            private fun RawEntity.buildCrdtSingletonMap(
                versionMap: VersionMap
            ): Map<FieldName, CrdtSingleton<Reference>> = singletons.mapValues { entry ->
                CrdtSingleton(
                    versionMap.copy(),
                    entry.value?.let { Reference(it.id) }
                )
            }

            @Suppress("UNCHECKED_CAST")
            private fun RawEntity.buildCrdtSetMap(
                versionMap: VersionMap
            ): Map<FieldName, CrdtSet<Reference>> = collections.mapValues { entry ->
                CrdtSet(
                    CrdtSet.DataImpl(
                        versionMap.copy(),
                        entry.value.map { CrdtSet.DataValue(versionMap, Reference(it.id)) }
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
        override val clock: VersionMap,
        open val field: FieldName
    ) : CrdtOperationAtTime {
        /**
         * Represents an [actor] having set the value of a member [CrdtSingleton] [field] to the
         * specified [value] at the time denoted by [clock].
         */
        data class SetSingleton(
            override val actor: Actor,
            override val clock: VersionMap,
            override val field: FieldName,
            val value: Reference
        ) : Operation(actor, clock, field) {
            /**
             * Converts the [CrdtEntity.Operation] into its corresponding [CrdtSingleton.Operation].
             */
            fun toSingletonOp(): SingletonOp.Update<Reference> =
                CrdtSingleton.Operation.Update(actor, clock, value)
        }

        /**
         * Represents an [actor] having cleared the value from a member [CrdtSingleton] [field] to
         * at the time denoted by [clock].
         */
        data class ClearSingleton(
            override val actor: Actor,
            override val clock: VersionMap,
            override val field: FieldName
        ) : Operation(actor, clock, field) {
            /**
             * Converts the [CrdtEntity.Operation] into its corresponding [CrdtSingleton.Operation].
             */
            fun toSingletonOp(): SingletonOp.Clear<Reference> =
                CrdtSingleton.Operation.Clear(actor, clock)
        }

        /**
         * Represents an [actor] having added a [Reference] to a member [CrdtSet] [field] at the
         * time denoted by [clock].
         */
        data class AddToSet(
            override val actor: Actor,
            override val clock: VersionMap,
            override val field: FieldName,
            val added: Reference
        ) : Operation(actor, clock, field) {
            /**
             * Converts the [CrdtEntity.Operation] into its corresponding [CrdtSet.Operation].
             */
            fun toSetOp(): SetOp.Add<Reference> = CrdtSet.Operation.Add(clock, actor, added)
        }

        /**
         * Represents an [actor] having removed the a value from a member [CrdtSet] [field] at the
         * time denoted by [clock].
         */
        data class RemoveFromSet(
            override val actor: Actor,
            override val clock: VersionMap,
            override val field: FieldName,
            val removed: Reference
        ) : Operation(actor, clock, field) {
            /**
             * Converts the [CrdtEntity.Operation] into its corresponding [CrdtSet.Operation].
             */
            fun toSetOp(): SetOp.Remove<Reference> = CrdtSet.Operation.Remove(clock, actor, removed)
        }
    }
}

