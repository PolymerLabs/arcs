package arcs.core.entity

import arcs.core.data.*

class DummyVariableEntity : VariableEntityBase(ENTITY_CLASS_NAME, SCHEMA), Storable, Dummy<DummyVariableEntity> {
    override var bool: Boolean? by SingletonProperty()
    override var num: Double? by SingletonProperty()
    override var text: String? by SingletonProperty()
    override var ref: Reference<DummyVariableEntity>? by SingletonProperty()
    override var bools: Set<Boolean> by CollectionProperty()
    override var nums: Set<Double> by CollectionProperty()
    override var texts: Set<String> by CollectionProperty()
    override var refs: Set<Reference<DummyVariableEntity>> by CollectionProperty()

    private val nestedEntitySpecs = mapOf(SCHEMA_HASH to DummyVariableEntity)

    override fun getSingletonValueForTest(field: String) = super.getSingletonValue(field)

    override fun getCollectionValueForTest(field: String) = super.getCollectionValue(field)

    override fun setSingletonValueForTest(field: String, value: Any?) =
        super.setSingletonValue(field, value)

    override fun setCollectionValueForTest(field: String, values: Set<Any>) =
        super.setCollectionValue(field, values)

    override fun deserializeForTest(rawEntity: RawEntity) = super.deserialize(rawEntity, nestedEntitySpecs)

    companion object : EntitySpec<DummyVariableEntity> {
        override fun deserialize(data: RawEntity) =
            DummyVariableEntity().apply {
                deserialize(data, mapOf(SCHEMA_HASH to DummyVariableEntity))
            }

        const val ENTITY_CLASS_NAME = "DummyVariableEntity"

        const val SCHEMA_HASH = "hijklmn"

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
