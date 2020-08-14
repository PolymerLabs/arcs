package arcs.core.entity

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName

// A restricted version of DummyEntity with less fields.	
class RestrictedDummyEntity : EntityBase(ENTITY_CLASS_NAME, SCHEMA), Storable {
    var text: String? by SingletonProperty()

    companion object : EntitySpec<RestrictedDummyEntity> {
        override fun deserialize(data: RawEntity) =
            RestrictedDummyEntity().apply {
                deserialize(data, mapOf(SCHEMA_HASH to RestrictedDummyEntity))
            }

        const val ENTITY_CLASS_NAME = "RestrictedDummyEntity"

        const val SCHEMA_HASH = "klmnop"

        override val SCHEMA = Schema(
            names = setOf(SchemaName(ENTITY_CLASS_NAME)),
            fields = SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text
                ),
                collections = emptyMap()
            ),
            hash = SCHEMA_HASH
        )
    }
}
