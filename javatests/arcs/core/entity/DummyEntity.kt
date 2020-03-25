package arcs.core.entity

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName

/**
 * Subclasses [EntityBase] and makes its protected methods public, so that we can call them
 * in the test. Also adds convenient getters and setters for entity fields, similar to what a
 * code-generated subclass would do.
 */
@Suppress("UNCHECKED_CAST")
class DummyEntity : EntityBase(ENTITY_CLASS_NAME, SCHEMA) {
    var bool: Boolean?
        get() = getSingletonValue("bool") as Boolean?
        set(value) = setSingletonValue("bool", value)

    var num: Double?
        get() = getSingletonValue("num") as Double?
        set(value) = setSingletonValue("num", value)

    var text: String?
        get() = getSingletonValue("text") as String?
        set(value) = setSingletonValue("text", value)

    var ref: Reference<DummyEntity>?
        get() = getSingletonValue("ref") as Reference<DummyEntity>?
        set(value) = setSingletonValue("ref", value)

    var bools: Set<Boolean>
        get() = getCollectionValue("bools") as Set<Boolean>
        set(values) = setCollectionValue("bools", values)

    var nums: Set<Double>
        get() = getCollectionValue("nums") as Set<Double>
        set(values) = setCollectionValue("nums", values)

    var texts: Set<String>
        get() = getCollectionValue("texts") as Set<String>
        set(values) = setCollectionValue("texts", values)

    var refs: Set<Reference<DummyEntity>>
        get() = getCollectionValue("refs") as Set<Reference<DummyEntity>>
        set(value) = setCollectionValue("refs", value)

    fun getSingletonValueForTest(field: String) = super.getSingletonValue(field)

    fun getCollectionValueForTest(field: String) = super.getCollectionValue(field)

    fun setSingletonValueForTest(field: String, value: Any?) =
        super.setSingletonValue(field, value)

    fun setCollectionValueForTest(field: String, values: Set<Any>) =
        super.setCollectionValue(field, values)

    fun deserializeForTest(rawEntity: RawEntity) = super.deserialize(rawEntity)

    companion object : EntitySpec<DummyEntity> {
        override fun deserialize(data: RawEntity) = DummyEntity().apply { deserialize(data) }

        const val ENTITY_CLASS_NAME = "DummyEntity"

        const val SCHEMA_HASH = "hash"

        override val SCHEMA = Schema(
            names = setOf(SchemaName(ENTITY_CLASS_NAME)),
            fields = SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "num" to FieldType.Number,
                    "bool" to FieldType.Boolean,
                    "ref" to FieldType.EntityRef(SCHEMA_HASH)
                ),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "nums" to FieldType.Number,
                    "bools" to FieldType.Boolean,
                    "refs" to FieldType.EntityRef(SCHEMA_HASH)
                )
            ),
            hash = SCHEMA_HASH
        )
    }
}
