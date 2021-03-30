package arcs.core.entity.testutil

import arcs.core.data.Annotation
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.entity.CollectionProperty
import arcs.core.entity.Entity
import arcs.core.entity.EntityBase
import arcs.core.entity.EntitySpec
import arcs.core.entity.Reference
import arcs.core.entity.SingletonProperty
import arcs.core.util.ArcsDuration
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt

interface DummyEntitySlice : Entity {
  var bool: Boolean?
  var nullableBool: Boolean?
  var nullableDouble: Double?
  var num: Double?
  var byte: Byte?
  var short: Short?
  var int: Int?
  var long: Long?
  var duration: ArcsDuration?
  var instant: ArcsInstant?
  var char: Char?
  var float: Float?
  var double: Double?
  var bigInt: BigInt?
  var text: String?
  var ref: Reference<DummyEntity>?
  var hardRef: Reference<DummyEntity>?
  var primList: List<Double>
  var refList: List<Reference<DummyEntity>>
  var inlineEntity: InlineDummyEntity
  var inlineList: List<InlineDummyEntity>
  var bools: Set<Boolean>
  var nums: Set<Double>
  var texts: Set<String>
  var refs: Set<Reference<DummyEntity>>
  var inlines: Set<InlineDummyEntity>
}

/**
 * Subclasses [EntityBase] and makes its protected methods public, so that we can call them
 * in the test. Also adds convenient getters and setters for entity fields, similar to what a
 * code-generated subclass would do.
 */
class DummyEntity(
  entityId: String? = null
) : EntityBase(ENTITY_CLASS_NAME, SCHEMA, entityId), DummyEntitySlice {
  override var bool: Boolean? by SingletonProperty(this)
  override var nullableBool: Boolean? by SingletonProperty(this)
  override var nullableDouble: Double? by SingletonProperty(this)
  override var num: Double? by SingletonProperty(this)
  override var byte: Byte? by SingletonProperty(this)
  override var short: Short? by SingletonProperty(this)
  override var int: Int? by SingletonProperty(this)
  override var long: Long? by SingletonProperty(this)
  override var duration: ArcsDuration? by SingletonProperty(this)
  override var instant: ArcsInstant? by SingletonProperty(this)
  override var char: Char? by SingletonProperty(this)
  override var float: Float? by SingletonProperty(this)
  override var double: Double? by SingletonProperty(this)
  override var bigInt: BigInt? by SingletonProperty(this)
  override var text: String? by SingletonProperty(this)
  override var ref: Reference<DummyEntity>? by SingletonProperty(this)
  override var hardRef: Reference<DummyEntity>? by SingletonProperty(this)
  override var primList: List<Double> by SingletonProperty(this)
  override var refList: List<Reference<DummyEntity>> by SingletonProperty(this)
  override var inlineEntity: InlineDummyEntity by SingletonProperty(this)
  override var inlineList: List<InlineDummyEntity> by SingletonProperty(this)
  override var bools: Set<Boolean> by CollectionProperty(this)
  override var nums: Set<Double> by CollectionProperty(this)
  override var texts: Set<String> by CollectionProperty(this)
  override var refs: Set<Reference<DummyEntity>> by CollectionProperty(this)
  override var inlines: Set<InlineDummyEntity> by CollectionProperty(this)

  private val nestedEntitySpecs = mapOf(
    SCHEMA_HASH to DummyEntity,
    InlineDummyEntity.SCHEMA_HASH to InlineDummyEntity
  )

  fun getSingletonValueForTest(field: String) = super.getSingletonValue(field)

  fun getCollectionValueForTest(field: String) = super.getCollectionValue(field)

  fun hasSingletonFieldForTest(field: String) = super.hasSingletonField(field)

  fun hasCollectionFieldForTest(field: String) = super.hasCollectionField(field)

  fun setSingletonValueForTest(field: String, value: Any?) =
    super.setSingletonValue(field, value)

  fun setCollectionValueForTest(field: String, values: Set<Any>) =
    super.setCollectionValue(field, values)

  fun deserializeForTest(rawEntity: RawEntity) = super.deserialize(rawEntity, nestedEntitySpecs)

  companion object : EntitySpec<DummyEntity> {
    override fun deserialize(data: RawEntity): DummyEntity {
      return DummyEntity().apply {
        deserialize(
          data,
          mapOf(
            SCHEMA_HASH to DummyEntity,
            InlineDummyEntity.SCHEMA_HASH to InlineDummyEntity
          )
        )
      }
    }

    const val ENTITY_CLASS_NAME = "DummyEntity"

    const val SCHEMA_HASH = "abcdef"

    override val SCHEMA = Schema(
      names = setOf(SchemaName(ENTITY_CLASS_NAME)),
      fields = SchemaFields(
        singletons = mapOf(
          "text" to FieldType.Text,
          "num" to FieldType.Number,
          "byte" to FieldType.Byte,
          "short" to FieldType.Short,
          "int" to FieldType.Int,
          "long" to FieldType.Long,
          "duration" to FieldType.Duration,
          "instant" to FieldType.Instant,
          "char" to FieldType.Char,
          "float" to FieldType.Float,
          "double" to FieldType.Double,
          "bigInt" to FieldType.BigInt,
          "bool" to FieldType.Boolean,
          "nullableBool" to FieldType.Boolean.nullable(),
          "nullableDouble" to FieldType.Double.nullable(),
          "ref" to FieldType.EntityRef(SCHEMA_HASH),
          "hardRef" to FieldType.EntityRef(SCHEMA_HASH, listOf(Annotation("hardRef"))),
          "primList" to FieldType.ListOf(FieldType.Number),
          "refList" to FieldType.ListOf(FieldType.EntityRef(SCHEMA_HASH)),
          "inlineEntity" to FieldType.InlineEntity(InlineDummyEntity.SCHEMA_HASH),
          "inlineList" to
            FieldType.ListOf(FieldType.InlineEntity(InlineDummyEntity.SCHEMA_HASH))
        ),
        collections = mapOf(
          "texts" to FieldType.Text,
          "nums" to FieldType.Number,
          "bools" to FieldType.Boolean,
          "refs" to FieldType.EntityRef(SCHEMA_HASH),
          "inlines" to FieldType.InlineEntity(InlineDummyEntity.SCHEMA_HASH)
        )
      ),
      hash = SCHEMA_HASH
    )
  }
}

class InlineDummyEntity : EntityBase(ENTITY_CLASS_NAME, SCHEMA, isInlineEntity = true) {
  var text: String? by SingletonProperty(this)

  private val nestedEntitySpecs = mapOf(SCHEMA_HASH to InlineDummyEntity)

  companion object : EntitySpec<InlineDummyEntity> {
    override fun deserialize(data: RawEntity) =
      InlineDummyEntity().apply { deserialize(data, mapOf(SCHEMA_HASH to InlineDummyEntity)) }

    const val ENTITY_CLASS_NAME = "InlineDummyEntity"

    const val SCHEMA_HASH = "inline_abcdef"

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
