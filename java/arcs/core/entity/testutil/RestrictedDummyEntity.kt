package arcs.core.entity.testutil

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.entity.EntityBase
import arcs.core.entity.EntitySpec
import arcs.core.entity.SingletonProperty
import arcs.core.entity.Storable

// A restricted version of DummyEntity with less fields.
class RestrictedDummyEntity : EntityBase(ENTITY_CLASS_NAME, SCHEMA), Storable {
  var text: String? by SingletonProperty(this)

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
