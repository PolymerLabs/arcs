/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data

import arcs.core.type.Tag
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
class ReferenceTypeTest(val params: TestParameters) {
  @Test
  fun tag_isReference() {
    assertThat(params.actual.tag).isEqualTo(Tag.Reference)
  }

  @Test
  fun containedType() {
    assertThat(params.actual.containedType).isEqualTo(params.expected.containedType)
  }

  @Test
  fun entitySchema() {
    assertThat(params.actual.entitySchema).isEqualTo(params.expected.entitySchema)
  }

  @Test
  fun toString_simple() {
    assertThat(params.actual.toString()).isEqualTo(params.expected.stringRepr)
  }

  @Test
  fun toString_withOptions_showFields_notPretty() {
    val options = Type.ToStringOptions(hideFields = false, pretty = false)
    assertThat(params.actual.toStringWithOptions(options))
      .isEqualTo("&${params.expected.containedType.toStringWithOptions(options)}")
  }

  @Test
  fun toString_withOptions_showFields_pretty() {
    val options = Type.ToStringOptions(hideFields = false, pretty = true)
    assertThat(params.actual.toStringWithOptions(options))
      .isEqualTo("&${params.expected.containedType.toStringWithOptions(options)}")
  }

  @Test
  fun toString_withOptions_hideFields_notPretty() {
    val options = Type.ToStringOptions(hideFields = true, pretty = false)
    assertThat(params.actual.toStringWithOptions(options))
      .isEqualTo("&${params.expected.containedType.toStringWithOptions(options)}")
  }

  @Test
  fun toString_withOptions_hideFields_pretty() {
    val options = Type.ToStringOptions(hideFields = true, pretty = true)
    assertThat(params.actual.toStringWithOptions(options))
      .isEqualTo("&${params.expected.containedType.toStringWithOptions(options)}")
  }

  data class TestParameters(
    val name: String,
    val actual: ReferenceType<*>,
    val expected: ExpectedValues
  ) {
    override fun toString(): String = name
  }

  data class ExpectedValues(
    val containedType: Type,
    val entitySchema: Schema?,
    val stringRepr: String
  )

  private data class FakeTypeWithDifferentResolvedType(override val tag: Tag = Tag.Count) : Type {
    override fun isAtLeastAsSpecificAs(other: Type): Boolean = true
    override fun toStringWithOptions(options: Type.ToStringOptions): String = toString()
  }

  companion object {
    private val ENTITY_SCHEMA = Schema(
      names = setOf(SchemaName("name 1"), SchemaName("name 2")),
      fields = SchemaFields(
        singletons = mapOf(
          "primitive" to FieldType.Int,
          "reference" to FieldType.EntityRef("1234"),
          "inline" to FieldType.InlineEntity("1234"),
          "list_primitive" to FieldType.ListOf(FieldType.Instant),
          "list_inline" to FieldType.ListOf(FieldType.InlineEntity("abcd")),
          "list_reference" to FieldType.ListOf(FieldType.EntityRef("abcd")),
          "tuple" to FieldType.Tuple(FieldType.Int, FieldType.Text)
        ),
        collections = mapOf(
          "primitive" to FieldType.Int,
          "reference" to FieldType.EntityRef("1234"),
          "inline" to FieldType.InlineEntity("1234"),
          "list_primitive" to FieldType.ListOf(FieldType.Instant),
          "list_inline" to FieldType.ListOf(FieldType.InlineEntity("abcd")),
          "list_reference" to FieldType.ListOf(FieldType.EntityRef("abcd")),
          "tuple" to FieldType.Tuple(FieldType.Int, FieldType.Text)
        )
      ),
      hash = "myEntityHash1234"
    )

    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS: Array<TestParameters> = arrayOf(
      TestParameters(
        name = "Collection of Count",
        actual = ReferenceType(CollectionType(CountType())),
        expected = ExpectedValues(
          containedType = CollectionType(collectionType = CountType()),
          entitySchema = null,
          stringRepr = "&CollectionType(collectionType=CountType(tag=Count))"
        )
      ),
      TestParameters(
        name = "Singleton of Count",
        actual = ReferenceType(SingletonType(CountType())),
        expected = ExpectedValues(
          containedType = SingletonType(CountType()),
          entitySchema = null,
          stringRepr = "&${SingletonType(CountType())}"
        )
      ),
      TestParameters(
        name = "Count",
        actual = ReferenceType(CountType()),
        expected = ExpectedValues(
          containedType = CountType(),
          entitySchema = null,
          stringRepr = "&CountType(tag=Count)"
        )
      ),
      TestParameters(
        name = "Entity",
        actual = ReferenceType(EntityType(ENTITY_SCHEMA)),
        expected = ExpectedValues(
          containedType = EntityType(ENTITY_SCHEMA),
          entitySchema = ENTITY_SCHEMA,
          stringRepr = "&${EntityType(ENTITY_SCHEMA)}"
        )
      ),
      TestParameters(
        name = "Collection of Entities",
        actual = ReferenceType(CollectionType(EntityType(ENTITY_SCHEMA))),
        expected = ExpectedValues(
          containedType = CollectionType(EntityType(ENTITY_SCHEMA)),
          entitySchema = ENTITY_SCHEMA,
          stringRepr = "&${CollectionType(EntityType(ENTITY_SCHEMA))}"
        )
      ),
      TestParameters(
        name = "Reference of Entity",
        actual = ReferenceType(ReferenceType(EntityType(ENTITY_SCHEMA))),
        expected = ExpectedValues(
          containedType = ReferenceType(EntityType(ENTITY_SCHEMA)),
          entitySchema = ENTITY_SCHEMA,
          stringRepr = "&${ReferenceType(EntityType(ENTITY_SCHEMA))}"
        )
      ),
      TestParameters(
        name = "Singleton of Entity",
        actual = ReferenceType(SingletonType(EntityType(ENTITY_SCHEMA))),
        expected = ExpectedValues(
          containedType = SingletonType(EntityType(ENTITY_SCHEMA)),
          entitySchema = ENTITY_SCHEMA,
          stringRepr = "&${SingletonType(EntityType(ENTITY_SCHEMA))}"
        )
      ),
      TestParameters(
        name = "Mux of Count",
        actual = ReferenceType(MuxType(CountType())),
        expected = ExpectedValues(
          containedType = MuxType(CountType()),
          entitySchema = null,
          stringRepr = "&${MuxType(CountType())}"
        )
      ),
      TestParameters(
        name = "Mux of Entity",
        actual = ReferenceType(MuxType(EntityType(ENTITY_SCHEMA))),
        expected = ExpectedValues(
          containedType = MuxType(EntityType(ENTITY_SCHEMA)),
          entitySchema = ENTITY_SCHEMA,
          stringRepr = "&${MuxType(EntityType(ENTITY_SCHEMA))}"
        )
      ),
      TestParameters(
        name = "Empty Tuple",
        actual = ReferenceType(TupleType()),
        expected = ExpectedValues(
          containedType = TupleType(),
          entitySchema = null,
          stringRepr = "&${TupleType()}"
        )
      ),
      TestParameters(
        name = "Type Variable, no max type allowed",
        actual = ReferenceType(TypeVariable("a", CountType(), false)),
        expected = ExpectedValues(
          containedType = TypeVariable("a", CountType(), false),
          entitySchema = null,
          stringRepr = "&${TypeVariable("a", CountType(), false)}"
        )
      ),
      TestParameters(
        name = "Type Variable, max type allowed",
        actual = ReferenceType(TypeVariable("a", CountType(), true)),
        expected = ExpectedValues(
          containedType = TypeVariable("a", CountType(), true),
          entitySchema = null,
          stringRepr = "&${TypeVariable("a", CountType(), true)}"
        )
      ),
      TestParameters(
        name = "Fake type with different resolved type",
        actual = ReferenceType(FakeTypeWithDifferentResolvedType()),
        expected = ExpectedValues(
          containedType = FakeTypeWithDifferentResolvedType(),
          entitySchema = null,
          stringRepr = "&${FakeTypeWithDifferentResolvedType()}"
        )
      )
    )
  }
}
