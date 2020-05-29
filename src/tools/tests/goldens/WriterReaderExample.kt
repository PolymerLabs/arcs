/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.core.data.testdata

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

import arcs.core.data.*
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.entity.Reference
import arcs.core.entity.SchemaRegistry
import arcs.core.entity.Tuple1
import arcs.core.entity.Tuple2
import arcs.core.entity.Tuple3
import arcs.core.entity.Tuple4
import arcs.core.entity.Tuple5
import arcs.core.entity.toPrimitiveValue
import arcs.sdk.*

typealias Reader_Data = AbstractReader.Reader_Data

abstract class AbstractReader : BaseParticle() {
    override val handles: Handles = Handles()


    @Suppress("UNCHECKED_CAST")
    class Reader_Data(
        name: String = "",
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Reader_Data", SCHEMA, entityId, creationTimestamp, expirationTimestamp) {

        var name: String
            get() = super.getSingletonValue("name") as String? ?: ""
            private set(_value) = super.setSingletonValue("name", _value)

        init {
            this.name = name
        }
        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(name: String = this.name) = Reader_Data(name = name)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(name: String = this.name) = Reader_Data(
            name = name,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Reader_Data> {

            override val SCHEMA = Schema(
                setOf(SchemaName("Thing")),
                SchemaFields(
                    singletons = mapOf("name" to FieldType.Text),
                    collections = emptyMap()
                ),
                "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Reader_Data().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    class Handles : HandleHolderBase(
        "Reader",
        mapOf("data" to Reader_Data)
    ) {
        val data: ReadSingletonHandle<Reader_Data> by handles
    }
}

typealias Writer_Data = AbstractWriter.Writer_Data

abstract class AbstractWriter : BaseParticle() {
    override val handles: Handles = Handles()


    @Suppress("UNCHECKED_CAST")
    class Writer_Data(
        name: String = "",
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("Writer_Data", SCHEMA, entityId, creationTimestamp, expirationTimestamp) {

        var name: String
            get() = super.getSingletonValue("name") as String? ?: ""
            private set(_value) = super.setSingletonValue("name", _value)

        init {
            this.name = name
        }
        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(name: String = this.name) = Writer_Data(name = name)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(name: String = this.name) = Writer_Data(
            name = name,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<Writer_Data> {

            override val SCHEMA = Schema(
                setOf(SchemaName("Thing")),
                SchemaFields(
                    singletons = mapOf("name" to FieldType.Text),
                    collections = emptyMap()
                ),
                "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = Writer_Data().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    class Handles : HandleHolderBase(
        "Writer",
        mapOf("data" to Writer_Data)
    ) {
        val data: WriteSingletonHandle<Writer_Data> by handles
    }
}

typealias ReadWriteReferences_InThingRefs = AbstractReadWriteReferences.ReadWriteReferencesInternal1
typealias ReadWriteReferences_OutThingRef = AbstractReadWriteReferences.ReadWriteReferencesInternal1

abstract class AbstractReadWriteReferences : BaseParticle() {
    override val handles: Handles = Handles()


    @Suppress("UNCHECKED_CAST")
    class ReadWriteReferencesInternal1(
        name: String = "",
        entityId: String? = null,
        creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp:  Long = RawEntity.UNINITIALIZED_TIMESTAMP
    ) : EntityBase("ReadWriteReferencesInternal1", SCHEMA, entityId, creationTimestamp, expirationTimestamp) {

        var name: String
            get() = super.getSingletonValue("name") as String? ?: ""
            private set(_value) = super.setSingletonValue("name", _value)

        init {
            this.name = name
        }
        /**
         * Use this method to create a new, distinctly identified copy of the entity.
         * Storing the copy will result in a new copy of the data being stored.
         */
        fun copy(name: String = this.name) = ReadWriteReferencesInternal1(name = name)
        /**
         * Use this method to create a new version of an existing entity.
         * Storing the mutation will overwrite the existing entity in the set, if it exists.
         */
        fun mutate(name: String = this.name) = ReadWriteReferencesInternal1(
            name = name,
            entityId = entityId,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        companion object : EntitySpec<ReadWriteReferencesInternal1> {

            override val SCHEMA = Schema(
                setOf(SchemaName("Thing")),
                SchemaFields(
                    singletons = mapOf("name" to FieldType.Text),
                    collections = emptyMap()
                ),
                "25e71af4e9fc8b6958fc46a8f4b7cdf6b5f31516",
                refinement = { _ -> true },
                query = null
            )

            private val nestedEntitySpecs: Map<String, EntitySpec<out Entity>> =
                emptyMap()

            init {
                SchemaRegistry.register(SCHEMA)
            }

            override fun deserialize(data: RawEntity) = ReadWriteReferencesInternal1().apply {
                deserialize(data, nestedEntitySpecs)
            }
        }
    }

    class Handles : HandleHolderBase(
        "ReadWriteReferences",
        mapOf(
            "inThingRefs" to ReadWriteReferences_InThingRefs,
            "outThingRef" to ReadWriteReferences_OutThingRef
        )
    ) {
        val inThingRefs: ReadCollectionHandle<Reference<ReadWriteReferences_InThingRefs>> by handles
        val outThingRef: WriteSingletonHandle<Reference<ReadWriteReferences_OutThingRef>> by handles
    }
}
