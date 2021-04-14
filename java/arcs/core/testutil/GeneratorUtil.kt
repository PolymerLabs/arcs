package arcs.core.testutil

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.testutil.CrdtEntityDataGenerator
import arcs.core.crdt.testutil.CrdtEntityGenerator
import arcs.core.crdt.testutil.RawEntityFromSchema
import arcs.core.crdt.testutil.VersionMapGenerator
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.testutil.FieldTypeGenerator
import arcs.core.data.testutil.FieldTypeWithReferencedSchemas
import arcs.core.data.testutil.ReferencableFromFieldType
import arcs.core.data.testutil.ReferencablePrimitiveFromPrimitiveType
import arcs.core.data.testutil.SchemaGenerator
import arcs.core.data.testutil.SchemaWithReferencedSchemas
import arcs.core.storage.testutil.dummyReference

/**
 * Returns a [Generator] of reasonably-sized [Schema] instances with as few constraints as
 * feasible.
 */
fun freeSchemaGenerator(
  s: FuzzingRandom
): Generator<SchemaWithReferencedSchemas> {
  val aFew = IntInRange(s, 1, 5)
  val terminalSchema = SchemaWithReferencedSchemas(
    Schema(setOf(SchemaName("empty")), SchemaFields(emptyMap(), emptyMap()), "empty"),
    emptyMap()
  )
  return generatorWithRecursion(5, Value(terminalSchema)) {
    SchemaGenerator(
      SetOf(midSizedAlphaNumericString(s), aFew),
      MapOf(midSizedAlphaNumericString(s), FieldTypeGenerator(s, it), aFew),
      MapOf(midSizedAlphaNumericString(s), FieldTypeGenerator(s, it), aFew),
      midSizedAlphaNumericString(s)
    )
  }
}

/**
 * Returns a [Transformer] that produces [Referencable]s matching a given [FieldType], with as few
 * constraints as feasible.
 */
fun freeReferencableFromFieldType(
  s: FuzzingRandom
): Transformer<FieldTypeWithReferencedSchemas, Referencable> {
  val noneOrMore = IntInRange(s, 0, 5)
  return transformerWithRecursion {
    ReferencableFromFieldType(
      ReferencablePrimitiveFromPrimitiveType(s),
      noneOrMore,
      RawEntityFromSchema(
        midSizedAlphaNumericString(s),
        it,
        noneOrMore,
        RandomLong(s),
        RandomLong(s)
      ),
      dummyReference(s)
    )
  }
}

/**
 * Returns a [Transformer] that produces [Referencable]s matching a given [FieldType]. The
 * [Referencable]s are intended to be used as field values in entities (e.g. this will generate
 * inline entities, not top level ones), and are compatible with their database representation,
 * ie they can be used to test database roundtrips.
 */
fun referencableFieldValueFromFieldTypeDbCompatible(
  s: FuzzingRandom
): Transformer<FieldTypeWithReferencedSchemas, Referencable> {
  // Empty collection in inline entities are not stored in the database.
  val oneOrMore = IntInRange(s, 1, 5)
  return transformerWithRecursion {
    ReferencableFromFieldType(
      ReferencablePrimitiveFromPrimitiveType(s, unicode = true),
      oneOrMore,
      RawEntityFromSchema(
        midSizedAlphaNumericString(s),
        it,
        oneOrMore,
        Value(-1),
        Value(-1)
      ),
      dummyReference(s)
    )
  }
}

/**
 * Returns a [Generator] of reasonably-sized [CrdtEntity] instances with as few constraints as
 * feasible.
 */
fun freeEntityGenerator(s: FuzzingRandom): Generator<CrdtEntity> {
  val aFew = IntInRange(s, 1, 5)
  val noneOrMore = IntInRange(s, 0, 5)
  return CrdtEntityGenerator(
    CrdtEntityDataGenerator(
      s,
      version = VersionMapGenerator(midSizedAlphaNumericString(s), IntInRange(s, 1, 20), aFew),
      singletonFields = SetOf(midSizedAlphaNumericString(s), noneOrMore),
      collectionFields = SetOf(midSizedAlphaNumericString(s), noneOrMore),
      collectionSize = noneOrMore,
      fieldType = FieldTypeGenerator(s, freeSchemaGenerator(s)),
      fieldValue = freeReferencableFromFieldType(s),
      creationTimestamp = RandomLong(s),
      expirationTimestamp = RandomLong(s),
      id = midSizedAlphaNumericString(s)
    )
  )
}
