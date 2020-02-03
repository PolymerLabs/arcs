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

package arcs.core.crdt

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtSet.Data as SetData
import arcs.core.crdt.CrdtSet.IOperation as ISetOp
import arcs.core.crdt.CrdtSet.Operation as SetOp
import arcs.core.crdt.CrdtSingleton.Data as SingletonData
import arcs.core.crdt.CrdtSingleton.IOperation as ISingletonOp
import arcs.core.crdt.CrdtSingleton.Operation as SingletonOp
import arcs.core.crdt.internal.Actor
import arcs.core.crdt.internal.VersionMap
import arcs.core.data.FieldName
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencablePrimitive

/**
 * A [CrdtModel] capable of managing a complex entity consisting of named [CrdtSingleton]s and named
 * [CrdtSet]s, each of which can manage various types of [Referencable] data.
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
    constructor(
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
                singletonChanges[fieldName]?.otherChange is CrdtChange.Data) {
                allOps = false
            }
        }
        _data.collections.forEach { (fieldName, collection) ->
            val otherCollection = other.collections[fieldName]
            if (otherCollection != null) {
                collectionChanges[fieldName] = collection.merge(otherCollection.data)
            }
            if (collectionChanges[fieldName]?.modelChange is CrdtChange.Data ||
                collectionChanges[fieldName]?.otherChange is CrdtChange.Data) {
                allOps = false
            }
        }
        val oldVersionMap = _data.versionMap.copy()
        _data.versionMap = _data.versionMap mergeWith other.versionMap

        if (oldVersionMap == _data.versionMap) {
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

    private fun ISingletonOp<Reference>.toEntityOp(fieldName: FieldName): Operation = when (this) {
        is SingletonOp.Update -> Operation.SetSingleton(actor, clock, fieldName, value)
        is SingletonOp.Clear -> Operation.ClearSingleton(actor, clock, fieldName)
        else -> throw CrdtException("Invalid operation")
    }

    private fun ISetOp<Reference>.toEntityOp(fieldName: FieldName): Operation = when (this) {
        is SetOp.Add -> Operation.AddToSet(actor, clock, fieldName, added)
        is SetOp.Remove -> Operation.RemoveFromSet(actor, clock, fieldName, removed)
        else -> throw CrdtException("Cannot convert FastForward to CrdtEntity Operation")
    }

    /** Defines the type of data managed by [CrdtEntity] for its singletons and collections. */
    interface Reference : Referencable {
        companion object {
            /** Simple converter from [Referencable] to [Reference]. */
            fun buildReference(referencable: Referencable): Reference =
                ReferenceImpl(referencable.id)
        }
    }

    /** Minimal [Reference] for contents of a singletons/collections in [Data]. */
    data class ReferenceImpl(override val id: ReferenceId) : Reference {
        override fun tryDereference(): Referencable =
            ReferencablePrimitive.tryDereference(id) ?: this

        override fun toString(): String = "Reference(${tryDereference()})"
    }

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
        constructor(
            versionMap: VersionMap,
            rawEntity: RawEntity,
            referenceBuilder: (Referencable) -> Reference
        ) : this(
            versionMap,
            rawEntity.buildCrdtSingletonMap({ versionMap }, referenceBuilder),
            rawEntity.buildCrdtSetMap({ versionMap }, referenceBuilder)
        )

        constructor(
            rawEntity: RawEntity,
            entityVersion: VersionMap,
            versionProvider: (FieldName) -> VersionMap,
            referenceBuilder: (Referencable) -> Reference
        ) : this(
            entityVersion,
            rawEntity.buildCrdtSingletonMap(versionProvider, referenceBuilder),
            rawEntity.buildCrdtSetMap(versionProvider, referenceBuilder)
        )

        fun toRawEntity() = RawEntity(
            singletons = singletons.mapValues { it.value.consumerView?.tryDereference() },
            collections = collections.mapValues {
                it.value.consumerView.map { item -> item.tryDereference() }.toSet()
            }
        )

        fun toRawEntity(id: ReferenceId) = RawEntity(
            id = id,
            singletons = singletons.mapValues { it.value.consumerView?.tryDereference() },
            collections = collections.mapValues {
                it.value.consumerView.map { item -> item.tryDereference() }.toSet()
            }
        )

        /** Makes a deep copy of this [CrdtEntity.Data] object. */
        // We can't rely on the Data Class's .copy(param=val,..) because it doesn't deep-copy the
        // inners, unfortunately.
        /* internal */ fun copy(): Data = Data(
            versionMap.copy(),
            HashMap(singletons.mapValues { it.value.copy() }),
            HashMap(collections.mapValues { it.value.copy() })
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
            fun toSetOp(): SetOp.Add<Reference> = CrdtSet.Operation.Add(actor, clock, added)
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
            fun toSetOp(): SetOp.Remove<Reference> = CrdtSet.Operation.Remove(actor, clock, removed)
        }
    }
}
