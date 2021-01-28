package arcs.core.entity.testutil

import arcs.core.data.RawEntity
import arcs.core.data.SchemaRegistry
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
    // The number of entities stored in the db per each top level entity.
    // 1 top level + 4 InnerEntity with 2 MoreInline each (1+4+4*2=13).
    const val DB_ENTITIES_PER_FIXTURE_ENTITY = 13

    /** Registers all schemas needed by [FixtureEntities] in the [SchemaRegistry]. */
    fun registerSchemas() {
      SchemaRegistry.register(FixtureEntity.SCHEMA)
      SchemaRegistry.register(InnerEntity.SCHEMA)
      SchemaRegistry.register(MoreInline.SCHEMA)
    }
  }
}
