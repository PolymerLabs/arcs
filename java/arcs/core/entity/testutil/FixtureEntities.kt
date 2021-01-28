package arcs.core.entity.testutil

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencableList
import arcs.core.entity.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import arcs.core.util.toBigInt

typealias FixtureEntity = AbstractTestParticle.FixtureEntity
typealias InnerEntity = AbstractTestParticle.InnerEntity
typealias MoreInline = AbstractTestParticle.MoreInline

/**
 * Generates entities with a large number of field types, to be used in tests.
 */
class FixtureEntities {
  private var entityCounter = 0
  private var innerEntityCounter = 0
  private var moreInlineCounter = 0

  /**
   * Every call to [generate] will return an entity with the same schema but different field values.
   */
  fun generate(
    entityId: String? = null,
    creationTimestamp: Long? = null,
    expirationTimestamp: Long? = null
  ): FixtureEntity {
    entityCounter++
    return FixtureEntity(
      entityId = entityId,
      creationTimestamp = creationTimestamp ?: RawEntity.UNINITIALIZED_TIMESTAMP,
      expirationTimestamp = expirationTimestamp ?: RawEntity.UNINITIALIZED_TIMESTAMP,
      textField = "text $entityCounter",
      numField = entityCounter.toDouble(),
      boolField = entityCounter % 2 == 0,
      byteField = entityCounter.toByte(),
      shortField = entityCounter.toShort(),
      intField = entityCounter,
      longField = entityCounter.toLong(),
      charField = 'a',
      floatField = entityCounter.toFloat(),
      doubleField = entityCounter.toDouble(),
      instantField = ArcsInstant.ofEpochMilli(entityCounter.toLong()),
      bigintField = entityCounter.toBigInt(),
      boolsField = setOf(true, false),
      numsField = setOf(-1.0, entityCounter.toDouble()),
      textsField = setOf("a", "$entityCounter"),
      bytesField = setOf(-1, entityCounter.toByte()),
      shortsField = setOf(-1, entityCounter.toShort()),
      intsField = setOf(-1, entityCounter),
      longsField = setOf(-1, entityCounter.toLong()),
      charsField = setOf('A', 'B'),
      floatsField = setOf(-1f, entityCounter.toFloat()),
      doublesField = setOf(-1.0, entityCounter.toDouble()),
      textListField = listOf("text $entityCounter", "text $entityCounter", "text $entityCounter"),
      numListField = listOf(entityCounter.toDouble(), entityCounter.toDouble(), 123.0),
      boolListField = listOf(true, false, true),
      instantsField = setOf(ArcsInstant.ofEpochMilli(1), ArcsInstant.ofEpochMilli(2)),
      bigintsField = setOf(BigInt.ONE, BigInt.TEN),
      inlineEntityField = generateInnerEntity(),
      inlineListField = listOf(generateInnerEntity(), generateInnerEntity()),
      // TODO(b/174426876): add more than one entity. Currently does not work due to b/174426876.
      inlinesField = setOf(generateInnerEntity()),
      referenceField = createInnerEntityReference("ref-$entityCounter"),
      hardReferenceField = createInnerEntityReference("hardref-$entityCounter"),
      referencesField = setOf(
        createInnerEntityReference("refs-$entityCounter-a"),
        createInnerEntityReference("refs-$entityCounter-b")
      ),
      referenceListField = listOf(
        createInnerEntityReference("lrefs-$entityCounter-a"),
        createInnerEntityReference("lrefs-$entityCounter-b")
      )
    )
  }

  fun generateEmpty() = FixtureEntity()

  fun generateInnerEntity(): InnerEntity {
    innerEntityCounter++
    return InnerEntity(
      textField = "inline text $innerEntityCounter",
      longField = innerEntityCounter.toLong(),
      numberField = innerEntityCounter.toDouble(),
      moreInlineField = generateMoreInline(),
      moreInlinesField = setOf(generateMoreInline())
    )
  }

  private fun generateMoreInline(): MoreInline {
    return MoreInline(textsField = setOf("more inline ${moreInlineCounter++}"))
  }

  fun createInnerEntityReference(
    id: String,
    key: StorageKey = DummyStorageKey(id)
  ): Reference<InnerEntity> {
    return Reference(
      InnerEntity,
      arcs.core.storage.Reference(id, key, null)
    )
  }

  companion object {
    /** Number of [InnerEntity] instances in each [FixtureEntity]. */
    const val NUM_INNER_ENTITIES = 4

    /** Number of [MoreInner] instances in each [FixtureEntity] (2 per [InnerEntity]). */
    const val NUM_MORE_INLINE_ENTITIES = 2 * NUM_INNER_ENTITIES

    /** The number of entities stored in the database for each top level [FixtureEntity]. */
    const val DB_ENTITIES_PER_FIXTURE_ENTITY = 1 + NUM_INNER_ENTITIES + NUM_MORE_INLINE_ENTITIES

    /** The number of field collections stored in the database for each [FixtureEntity]. */
    val DB_COLLECTIONS_PER_FIXTURE_ENTITY: Int

    /**
     * The number of collection entries stored in the database for each non-empty [FixtureEntity].
     */
    val DB_COLLECTION_ENTRIES_PER_FIXTURE_ENTITY: Int

    /** The number of field values stored in the database for each non-empty [FixtureEntity]. */
    val DB_FIELD_VALUES_PER_FIXTURE_ENTITY: Int

    // Compute the constants above using an example generated entity.
    init {
      val exampleFixtureEntity = FixtureEntities().generate()
      val exampleInnerEntity = exampleFixtureEntity.inlineEntityField
      val exampleMoreInlineEntity = exampleInnerEntity.moreInlineField
      val rawFixture = exampleFixtureEntity.serialize()
      val rawInner = exampleInnerEntity.serialize()
      val rawMoreInline = exampleMoreInlineEntity.serialize()

      DB_COLLECTIONS_PER_FIXTURE_ENTITY = FixtureEntity.SCHEMA.numCollections() +
        NUM_INNER_ENTITIES * InnerEntity.SCHEMA.numCollections() +
        NUM_MORE_INLINE_ENTITIES * MoreInline.SCHEMA.numCollections()

      DB_COLLECTION_ENTRIES_PER_FIXTURE_ENTITY = rawFixture.numCollectionValues() +
        NUM_INNER_ENTITIES * rawInner.numCollectionValues() +
        NUM_MORE_INLINE_ENTITIES * rawMoreInline.numCollectionValues()

      DB_FIELD_VALUES_PER_FIXTURE_ENTITY = FixtureEntity.SCHEMA.numFields() +
        NUM_INNER_ENTITIES * InnerEntity.SCHEMA.numFields() +
        NUM_MORE_INLINE_ENTITIES * MoreInline.SCHEMA.numFields()
    }

    /** Registers all schemas needed by [FixtureEntities] in the [SchemaRegistry]. */
    fun registerSchemas() {
      SchemaRegistry.register(FixtureEntity.SCHEMA)
      SchemaRegistry.register(InnerEntity.SCHEMA)
      SchemaRegistry.register(MoreInline.SCHEMA)
    }
  }
}

/** Counts all collection fields, plus all singleton List fields. */
private fun Schema.numCollections(): Int {
  return fields.collections.size + fields.singletons.values.count { it is FieldType.ListOf }
}

/** Counts all collection entries, plus all singleton List entries. */
private fun RawEntity.numCollectionValues(): Int {
  return collections.values.sumBy { it.size } +
    singletons.values.filterIsInstance<ReferencableList<*>>().sumBy { it.value.size }
}

/** Counts all fields. */
private fun Schema.numFields(): Int {
  return fields.singletons.size + fields.collections.size
}
