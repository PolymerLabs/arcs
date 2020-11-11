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
import arcs.core.type.TypeFactory
import arcs.core.type.TypeLiteral
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
  fun canEnsureResolved() {
    assertThat(params.actual.canEnsureResolved).isEqualTo(params.expected.canEnsureResolved)
  }

  @Test
  fun entitySchema() {
    assertThat(params.actual.entitySchema).isEqualTo(params.expected.entitySchema)
  }

  @Test
  fun resolvedType() {
    assertThat(params.actual.resolvedType).isEqualTo(params.expected.resolvedType)
  }

  @Test
  fun toLiteral() {
    assertThat(params.actual.toLiteral()).isEqualTo(params.expected.literal)
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

  @Test
  fun registeredBuilder_canBuildMatchFromLiteral() {
    if (params.expected.containedType is FakeTypeWithDifferentResolvedType) {
      // We do not have a way of registering our fake type with the TypeFactory
      // (without creating a new tag type), so skip this test for the cases when we are using our
      // fake type.
      return
    }

    assertThat(TypeFactory.getType(params.actual.toLiteral())).isEqualTo(params.actual)
  }

  @Test
  fun copy_emptyMap() {
    if (params.expected.containedType is FakeTypeWithDifferentResolvedType) {
      // We do not have a way of registering our fake type with the TypeFactory
      // (without creating a new tag type), so skip this test for the cases when we are using our
      // fake type.
      return
    }

    assertThat((params.actual as Type).copy(mutableMapOf())).isEqualTo(params.actual)
  }

  @Test
  fun copy_nonEmptyMap() {
    if (params.expected.containedType is FakeTypeWithDifferentResolvedType) {
      // We do not have a way of registering our fake type with the TypeFactory
      // (without creating a new tag type), so skip this test for the cases when we are using our
      // fake type.
      return
    }

    val variableMap = mutableMapOf<Any, Any>("foo" to "bar")
    assertThat((params.actual as Type).copy(variableMap))
      .isEqualTo(
        TypeFactory.getType(
          ReferenceType.Literal(
            params.actual.tag,
            params.actual.containedType.copy(variableMap).toLiteral()
          )
        )
      )
  }

  @Test
  fun copyWithResolutions_emptyMap() {
    assertThat(params.actual.copyWithResolutions(mutableMapOf()))
      .isEqualTo(
        ReferenceType(params.expected.containedType.copyWithResolutions(mutableMapOf()))
      )
  }

  @Test
  fun copyWithResolutions_nonEmptyMap() {
    val variableMap = mutableMapOf<Any, Any>("foo" to "bar")
    assertThat(params.actual.copyWithResolutions(variableMap))
      .isEqualTo(
        ReferenceType(params.expected.containedType.copyWithResolutions(variableMap))
      )
  }

  @Test
  fun maybeEnsureResolved() {
    assertThat(params.actual.maybeEnsureResolved())
      .isEqualTo(params.expected.containedType.maybeEnsureResolved())
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
    val canEnsureResolved: Boolean,
    val entitySchema: Schema?,
    val resolvedType: Type,
    val literal: TypeLiteral,
    val stringRepr: String
  )

  private data class FakeTypeWithDifferentResolvedType(override val tag: Tag = Tag.Count) : Type {
    override val isResolved: Boolean = true
    override val canEnsureResolved: Boolean = true
    override val resolvedType: Type = CountType()

    override fun toLiteral(): TypeLiteral = Literal()
    override fun maybeEnsureResolved(): Boolean = true
    override fun isAtLeastAsSpecificAs(other: Type): Boolean = true
    override fun copy(variableMap: MutableMap<Any, Any>): Type = this
    override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type = this
    override fun toStringWithOptions(options: Type.ToStringOptions): String = toString()

    private data class Literal(override val tag: Tag = Tag.Count) : TypeLiteral
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
          canEnsureResolved = true,
          entitySchema = null,
          resolvedType = ReferenceType(CollectionType(CountType())),
          literal = ReferenceType.Literal(Tag.Reference, CollectionType(CountType()).toLiteral()),
          stringRepr = "&CollectionType(collectionType=CountType(tag=Count))"
        )
      ),
      TestParameters(
        name = "Singleton of Count",
        actual = ReferenceType(SingletonType(CountType())),
        expected = ExpectedValues(
          containedType = SingletonType(CountType()),
          canEnsureResolved = true,
          entitySchema = null,
          resolvedType = ReferenceType(SingletonType(CountType())),
          literal = ReferenceType.Literal(
            Tag.Reference,
            SingletonType(CountType()).toLiteral()
          ),
          stringRepr = "&${SingletonType(CountType())}"
        )
      ),
      TestParameters(
        name = "Count",
        actual = ReferenceType(CountType()),
        expected = ExpectedValues(
          containedType = CountType(),
          canEnsureResolved = true,
          entitySchema = null,
          resolvedType = ReferenceType(CountType()),
          literal = ReferenceType.Literal(Tag.Reference, CountType().toLiteral()),
          stringRepr = "&CountType(tag=Count)"
        )
      ),
      TestParameters(
        name = "Entity",
        actual = ReferenceType(EntityType(ENTITY_SCHEMA)),
        expected = ExpectedValues(
          containedType = EntityType(ENTITY_SCHEMA),
          canEnsureResolved = true,
          entitySchema = ENTITY_SCHEMA,
          resolvedType = ReferenceType(EntityType(ENTITY_SCHEMA)),
          literal = ReferenceType.Literal(Tag.Reference, EntityType(ENTITY_SCHEMA).toLiteral()),
          stringRepr = "&${EntityType(ENTITY_SCHEMA)}"
        )
      ),
      TestParameters(
        name = "Collection of Entities",
        actual = ReferenceType(CollectionType(EntityType(ENTITY_SCHEMA))),
        expected = ExpectedValues(
          containedType = CollectionType(EntityType(ENTITY_SCHEMA)),
          canEnsureResolved = true,
          entitySchema = ENTITY_SCHEMA,
          resolvedType = ReferenceType(CollectionType(EntityType(ENTITY_SCHEMA))),
          literal = ReferenceType.Literal(
            Tag.Reference,
            CollectionType(EntityType(ENTITY_SCHEMA)).toLiteral()
          ),
          stringRepr = "&${CollectionType(EntityType(ENTITY_SCHEMA))}"
        )
      ),
      TestParameters(
        name = "Reference of Entity",
        actual = ReferenceType(ReferenceType(EntityType(ENTITY_SCHEMA))),
        expected = ExpectedValues(
          containedType = ReferenceType(EntityType(ENTITY_SCHEMA)),
          canEnsureResolved = true,
          entitySchema = ENTITY_SCHEMA,
          resolvedType = ReferenceType(ReferenceType(EntityType(ENTITY_SCHEMA))),
          literal = ReferenceType.Literal(
            Tag.Reference,
            ReferenceType(EntityType(ENTITY_SCHEMA)).toLiteral()
          ),
          stringRepr = "&${ReferenceType(EntityType(ENTITY_SCHEMA))}"
        )
      ),
      TestParameters(
        name = "Singleton of Entity",
        actual = ReferenceType(SingletonType(EntityType(ENTITY_SCHEMA))),
        expected = ExpectedValues(
          containedType = SingletonType(EntityType(ENTITY_SCHEMA)),
          canEnsureResolved = true,
          entitySchema = ENTITY_SCHEMA,
          resolvedType = ReferenceType(SingletonType(EntityType(ENTITY_SCHEMA))),
          literal = ReferenceType.Literal(
            Tag.Reference,
            SingletonType(EntityType(ENTITY_SCHEMA)).toLiteral()
          ),
          stringRepr = "&${SingletonType(EntityType(ENTITY_SCHEMA))}"
        )
      ),
      TestParameters(
        name = "Mux of Count",
        actual = ReferenceType(MuxType(CountType())),
        expected = ExpectedValues(
          containedType = MuxType(CountType()),
          canEnsureResolved = true,
          entitySchema = null,
          resolvedType = ReferenceType(MuxType(CountType())),
          literal = ReferenceType.Literal(
            Tag.Reference,
            MuxType(CountType()).toLiteral()
          ),
          stringRepr = "&${MuxType(CountType())}"
        )
      ),
      TestParameters(
        name = "Mux of Entity",
        actual = ReferenceType(MuxType(EntityType(ENTITY_SCHEMA))),
        expected = ExpectedValues(
          containedType = MuxType(EntityType(ENTITY_SCHEMA)),
          canEnsureResolved = true,
          entitySchema = ENTITY_SCHEMA,
          resolvedType = ReferenceType(MuxType(EntityType(ENTITY_SCHEMA))),
          literal = ReferenceType.Literal(
            Tag.Reference,
            MuxType(EntityType(ENTITY_SCHEMA)).toLiteral()
          ),
          stringRepr = "&${MuxType(EntityType(ENTITY_SCHEMA))}"
        )
      ),
      TestParameters(
        name = "Empty Tuple",
        actual = ReferenceType(TupleType()),
        expected = ExpectedValues(
          containedType = TupleType(),
          canEnsureResolved = true,
          entitySchema = null,
          resolvedType = ReferenceType(TupleType()),
          literal = ReferenceType.Literal(
            Tag.Reference,
            TupleType().toLiteral()
          ),
          stringRepr = "&${TupleType()}"
        )
      ),
      TestParameters(
        name = "Type Variable, no max type allowed",
        actual = ReferenceType(TypeVariable("a", CountType(), false)),
        expected = ExpectedValues(
          containedType = TypeVariable("a", CountType(), false),
          canEnsureResolved = true,
          entitySchema = null,
          resolvedType = ReferenceType(TypeVariable("a", CountType(), false)),
          literal = ReferenceType.Literal(
            Tag.Reference,
            TypeVariable("a", CountType(), false).toLiteral()
          ),
          stringRepr = "&${TypeVariable("a", CountType(), false)}"
        )
      ),
      TestParameters(
        name = "Type Variable, max type allowed",
        actual = ReferenceType(TypeVariable("a", CountType(), true)),
        expected = ExpectedValues(
          containedType = TypeVariable("a", CountType(), true),
          canEnsureResolved = true,
          entitySchema = null,
          resolvedType = ReferenceType(TypeVariable("a", CountType(), true)),
          literal = ReferenceType.Literal(
            Tag.Reference,
            TypeVariable("a", CountType(), true).toLiteral()
          ),
          stringRepr = "&${TypeVariable("a", CountType(), true)}"
        )
      ),
      TestParameters(
        name = "Fake type with different resolved type",
        actual = ReferenceType(FakeTypeWithDifferentResolvedType()),
        expected = ExpectedValues(
          containedType = FakeTypeWithDifferentResolvedType(),
          canEnsureResolved = true,
          entitySchema = null,
          resolvedType = ReferenceType(CountType()),
          literal = ReferenceType.Literal(
            Tag.Reference,
            FakeTypeWithDifferentResolvedType().toLiteral()
          ),
          stringRepr = "&${FakeTypeWithDifferentResolvedType()}"
        )
      )
    )
  }
}
