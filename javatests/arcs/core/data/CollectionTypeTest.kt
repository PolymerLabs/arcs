package arcs.core.data

import arcs.core.crdt.CrdtSet
import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.type.Type.ToStringOptions
import arcs.core.type.TypeFactory
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CollectionTypeTest {
  @Test
  fun tag_collection() {
    assertThat(CollectionType(ENTITY_PRODUCT_TYPE).tag).isEqualTo(Tag.Collection)
    assertThat(CollectionType(REFERENCE_PRODUCT_TYPE).tag).isEqualTo(
      Tag.Collection
    )
    assertThat(CollectionType(SINGLETON_PRODUCT_TYPE).tag).isEqualTo(
      Tag.Collection
    )
  }

  @Test
  fun entitySchema() {
    assertThat(CollectionType(EntityType(PRODUCT_SCHEMA)).entitySchema).isEqualTo(PRODUCT_SCHEMA)
    assertThat(CollectionType(SingletonType(EntityType(PRODUCT_SCHEMA))).entitySchema)
      .isEqualTo(PRODUCT_SCHEMA)
    assertThat(CollectionType(ReferenceType(EntityType(PRODUCT_SCHEMA))).entitySchema)
      .isEqualTo(PRODUCT_SCHEMA)
  }

  @Test
  fun entitySchema_countType_null() {
    assertThat(CollectionType(CountType()).entitySchema).isNull()
  }

  @Test
  fun containedType_entity() {
    val collectionType = CollectionType(ENTITY_PRODUCT_TYPE)
    assertThat(collectionType.containedType).isEqualTo(ENTITY_PRODUCT_TYPE)
    assertThat(collectionType.collectionType).isEqualTo(ENTITY_PRODUCT_TYPE)
  }

  @Test
  fun containedType_singleton() {
    val collectionType = CollectionType(SINGLETON_PRODUCT_TYPE)
    assertThat(collectionType.containedType).isEqualTo(SINGLETON_PRODUCT_TYPE)
    assertThat(collectionType.collectionType).isEqualTo(SINGLETON_PRODUCT_TYPE)
  }

  @Test
  fun containedType_reference() {
    val collectionType = CollectionType(REFERENCE_PRODUCT_TYPE)
    assertThat(collectionType.containedType).isEqualTo(REFERENCE_PRODUCT_TYPE)
    assertThat(collectionType.collectionType).isEqualTo(REFERENCE_PRODUCT_TYPE)
  }

  @Test
  fun collectionOf() {
    val collectionType = ENTITY_PRODUCT_TYPE.collectionOf()!!
    assertThat(collectionType.tag).isEqualTo(Tag.Collection)
    assertThat(collectionType.entitySchema).isEqualTo(PRODUCT_SCHEMA)
    assertThat(collectionType.containedType).isEqualTo(ENTITY_PRODUCT_TYPE)
  }

  @Test
  fun collectionOf_null() {
    val type: Type? = null
    assertThat(type.collectionOf()).isNull()
  }

  @Test
  fun createCrdtModel() {
    val collectionType = CollectionType(ENTITY_PRODUCT_TYPE)
    assertThat(collectionType.createCrdtModel()).isInstanceOf(CrdtSet::class.java)
  }

  @Test
  fun copy() {
    val collectionType = CollectionType(ENTITY_PRODUCT_TYPE)
    assertThat(collectionType.copy(mutableMapOf())).isEqualTo(collectionType)
  }

  @Test
  fun copyWithResolutions() {
    val collectionType = CollectionType(ReferenceType(ENTITY_PRODUCT_TYPE))
    val variableMap = mutableMapOf<Any, Any>()
    assertThat(collectionType.copyWithResolutions(variableMap)).isEqualTo(collectionType)
    // variable map contains the collection's containedType.
    assertThat(variableMap).hasSize(1)
    assertThat(variableMap).containsEntry(ENTITY_PRODUCT_TYPE.entitySchema, ENTITY_PRODUCT_TYPE)
  }

  @Test
  fun toLiteral() {
    val literal = CollectionType(ENTITY_PRODUCT_TYPE).toLiteral()
    assertThat(literal.tag).isEqualTo(Tag.Collection)
    assertThat(literal.data).isEqualTo(ENTITY_PRODUCT_TYPE.toLiteral())
  }

  @Test
  fun toStringWithOptions_entityType() {
    assertThat(CollectionType(ENTITY_PRODUCT_TYPE).toStringWithOptions(ToStringOptions()))
      .isEqualTo("[Product Thing {name: Text, ratings: [Number]}]")
  }

  @Test
  fun toStringWithOptions_singletonType() {
    assertThat(CollectionType(SINGLETON_PRODUCT_TYPE).toStringWithOptions(ToStringOptions()))
      .isEqualTo("[Singleton]")
  }

  @Test
  fun toStringWithOptions_referenceType() {
    assertThat(CollectionType(REFERENCE_PRODUCT_TYPE).toStringWithOptions(ToStringOptions()))
      .isEqualTo("[&Product Thing {name: Text, ratings: [Number]}]")
  }

  @Test
  fun toStringWithOptions_optionsHideFields() {
    val collectionType = CollectionType(ENTITY_PRODUCT_TYPE)
    assertThat(collectionType.toStringWithOptions(ToStringOptions(hideFields = true)))
      .isEqualTo("[Product Thing {...}]")
  }

  @Test
  fun toStringWithOptions_optionsPretty() {
    val collectionType = CollectionType(ENTITY_PRODUCT_TYPE)
    assertThat(collectionType.toStringWithOptions(ToStringOptions(pretty = true)))
      .isEqualTo("Product Thing {name: Text, ratings: [Number]} Collection")
  }

  @Test
  fun toStringWithOptions_optionsPrettyHideFields() {
    val collectionType = CollectionType(ENTITY_PRODUCT_TYPE)
    assertThat(
      collectionType.toStringWithOptions(ToStringOptions(hideFields = true, pretty = true))
    ).isEqualTo("Product Thing {...} Collection")
  }

  @Test
  fun init_typeRegistry() {
    val collectionType = CollectionType(ENTITY_PRODUCT_TYPE)
    assertThat(TypeFactory.getType(collectionType.toLiteral())).isEqualTo(collectionType)
  }

  companion object {
    private val PRODUCT_SCHEMA = Schema(
      setOf(SchemaName("Product"), SchemaName("Thing")),
      SchemaFields(
        mapOf("name" to FieldType.Text),
        mapOf("ratings" to FieldType.Number)
      ),
      "fake-hash"
    )
    private val ENTITY_PRODUCT_TYPE = EntityType(PRODUCT_SCHEMA)
    private val SINGLETON_PRODUCT_TYPE = SingletonType(ENTITY_PRODUCT_TYPE)
    private val REFERENCE_PRODUCT_TYPE = ReferenceType(ENTITY_PRODUCT_TYPE)
  }
}
