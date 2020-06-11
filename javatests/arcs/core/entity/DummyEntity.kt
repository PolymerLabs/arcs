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
class DummyEntity : EntityBase(ENTITY_CLASS_NAME, SCHEMA), Storable, Dummy<DummyEntity> {
    override var bool: Boolean? by SingletonProperty()
    override var num: Double? by SingletonProperty()
    override var text: String? by SingletonProperty()
    override var ref: Reference<DummyEntity>? by SingletonProperty()
    override var bools: Set<Boolean> by CollectionProperty()
    override var nums: Set<Double> by CollectionProperty()
    override var texts: Set<String> by CollectionProperty()
    override var refs: Set<Reference<DummyEntity>> by CollectionProperty()

    private val nestedEntitySpecs = mapOf(SCHEMA_HASH to DummyEntity)

    override fun getSingletonValueForTest(field: String) = super.getSingletonValue(field)

    override fun getCollectionValueForTest(field: String) = super.getCollectionValue(field)

    override fun setSingletonValueForTest(field: String, value: Any?) =
        super.setSingletonValue(field, value)

    override fun setCollectionValueForTest(field: String, values: Set<Any>) =
        super.setCollectionValue(field, values)

    override fun deserializeForTest(rawEntity: RawEntity) = super.deserialize(rawEntity, nestedEntitySpecs)

    companion object : EntitySpec<DummyEntity> {
        override fun deserialize(data: RawEntity) = 
            DummyEntity().apply { deserialize(data, mapOf(SCHEMA_HASH to DummyEntity)) }

        const val ENTITY_CLASS_NAME = "DummyEntity"

        const val SCHEMA_HASH = "abcdef"

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
