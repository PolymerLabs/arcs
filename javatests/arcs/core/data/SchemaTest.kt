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

import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.expression.asExpr
import arcs.core.data.expression.eq
import arcs.core.data.expression.query
import arcs.core.data.expression.text
import arcs.core.data.util.toReferencable
import arcs.core.type.Type.ToStringOptions
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SchemaTest {
  @Test
  fun toString_withArguments_printsOutTheSchema() {
    assertThat(PRODUCT_SCHEMA.toString(ToStringOptions())).isEqualTo(
      "Product Thing {name: Text, ratings: [Number]}"
    )
  }

  @Test
  fun toString_withoutArguments_printsOutTheSchema() {
    assertThat(PRODUCT_SCHEMA.toString()).isEqualTo(
      "Product Thing {name: Text, ratings: [Number]}"
    )
  }

  @Test
  fun toString_canHideFields() {
    assertThat(PRODUCT_SCHEMA.toString(ToStringOptions(hideFields = true))).isEqualTo(
      "Product Thing {...}"
    )
  }

  @Test
  fun init_schemaRegistry() {
    SchemaRegistry.clearForTest()
    val testSchema = Schema(
      setOf(SchemaName("Test")),
      SchemaFields(emptyMap(), emptyMap()),
      "test-hash"
    )
    assertThat(SchemaRegistry.getSchema(testSchema.hash)).isEqualTo(testSchema)
  }

  @Test
  fun init_emptySchema() {
    assertThat(Schema.EMPTY.name).isNull()
    assertThat(Schema.EMPTY.names).isEmpty()
    assertThat(Schema.EMPTY.fields.singletons).isEmpty()
    assertThat(Schema.EMPTY.fields.collections).isEmpty()
  }

  @Test
  fun init_schemaWithNamesAndFields() {
    assertThat(PRODUCT_SCHEMA.name?.name).isEqualTo("Product")
    assertThat(PRODUCT_SCHEMA.names.map { it.name }).containsExactlyElementsIn(
      listOf("Product", "Thing")
    )
    assertThat(PRODUCT_SCHEMA.fields.singletons).containsExactly("name", FieldType.Text)
    assertThat(PRODUCT_SCHEMA.fields.collections).containsExactly("ratings", FieldType.Number)
  }

  @Test
  fun refinement_true() {
    val dummyEntity = RawEntity(id = "id", singletons = emptyMap(), collections = emptyMap())
    assertThat(PRODUCT_SCHEMA.refinement(dummyEntity)).isTrue()
    assertThat(Schema.EMPTY.refinement(dummyEntity)).isTrue()
  }

  @Test
  fun refinement_false() {
    val schemaWithFalseRefinement = Schema(
      setOf(SchemaName("Test")),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "fake-hash",
      false.asExpr()
    )
    val dummyEntity = RawEntity(id = "id", singletons = emptyMap(), collections = emptyMap())
    assertThat(schemaWithFalseRefinement.refinement(dummyEntity)).isFalse()
  }

  @Test
  fun refinement_singletonText() {
    val refinedProductSchema = Schema(
      setOf(SchemaName("Product")),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "fake-hash",
      text("name") eq "hello".asExpr()
    )
    val unsuitableEntity = RawEntity(
      id = "id",
      singletons = mapOf("name" to "world".toReferencable()),
      collections = emptyMap()
    )
    val okEntity = RawEntity(
      id = "id",
      singletons = mapOf("name" to "hello".toReferencable()),
      collections = emptyMap()
    )
    assertThat(refinedProductSchema.refinement(unsuitableEntity)).isFalse()
    assertThat(refinedProductSchema.refinement(okEntity)).isTrue()
  }

  @Test
  fun query_true() {
    val dummyEntity = RawEntity(id = "id", singletons = emptyMap(), collections = emptyMap())
    assertThat(Schema.EMPTY.query?.invoke(dummyEntity, true)).isTrue()
    assertThat(PRODUCT_SCHEMA.query?.invoke(dummyEntity, true)).isTrue()
  }

  @Test
  fun query_false() {
    val schemaWithFalseQuery = Schema(
      names = setOf(SchemaName("Test")),
      fields = SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      hash = "fake-hash",
      queryExpression = false.asExpr()
    )
    val dummyEntity = RawEntity(id = "id", singletons = emptyMap(), collections = emptyMap())
    assertThat(schemaWithFalseQuery.query?.invoke(dummyEntity, true)).isFalse()
  }

  @Test
  fun query_singletonText() {
    val queryByName = text("name") eq query("queryArgument")
    val productSchemaWithQuery = Schema(
      names = setOf(SchemaName("Product")),
      fields = SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      hash = "fake-hash",
      queryExpression = queryByName
    )
    val entityName = "hello"
    val namedEntity = RawEntity(
      id = "id",
      singletons = mapOf("name" to entityName.toReferencable()),
      collections = emptyMap()
    )

    assertThat(productSchemaWithQuery.query?.invoke(namedEntity, entityName)).isTrue()
    assertThat(productSchemaWithQuery.query?.invoke(namedEntity, "someOtherName")).isFalse()
  }

  @Test
  fun createCrdtEntityModel_emptySchema() {
    val emptyEntity = Schema.EMPTY.createCrdtEntityModel()
    assertThat(emptyEntity.data.singletons).isEmpty()
    assertThat(emptyEntity.data.collections).isEmpty()
  }

  @Test
  fun createCrdtEntityModel_productsSchema() {
    val productEntity = PRODUCT_SCHEMA.createCrdtEntityModel()
    assertThat(productEntity.data.singletons.keys).containsExactly("name")
    assertThat(productEntity.data.singletons["name"]).isInstanceOf(CrdtSingleton::class.java)
    assertThat(productEntity.data.collections.keys).containsExactly("ratings")
    assertThat(productEntity.data.collections["ratings"]).isInstanceOf(CrdtSet::class.java)
  }

  @Test
  fun toLiteral_emptyNamesAndFields() {
    val emptyLiteral = Schema.EMPTY.toLiteral()
    assertThat(emptyLiteral.names).isEmpty()
    assertThat(emptyLiteral.fields.singletons).isEmpty()
    assertThat(emptyLiteral.fields.collections).isEmpty()
    assertThat(emptyLiteral.hash).isEqualTo(Schema.EMPTY.hash)
  }

  @Test
  fun toLiteral_namesAndField() {
    val productLiteral = PRODUCT_SCHEMA.toLiteral()
    assertThat(productLiteral.names).isEqualTo(setOf(SchemaName("Product"), SchemaName("Thing")))
    assertThat(productLiteral.fields.singletons).containsExactly("name", FieldType.Text)
    assertThat(productLiteral.fields.collections).containsExactly("ratings", FieldType.Number)
    assertThat(productLiteral.hash).isEqualTo(PRODUCT_SCHEMA.hash)
  }

  @Test
  fun toLiteral_namesAndField_toJson() {
    assertThat(PRODUCT_SCHEMA.toLiteral().toJson()).isEqualTo(
      "{\"names\":[\"\"SchemaName(name=Product)\", \"SchemaName(name=Thing)\"\"]}"
    )
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
  }
}
