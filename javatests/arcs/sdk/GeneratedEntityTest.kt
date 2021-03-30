package arcs.sdk

import arcs.core.common.Id
import arcs.core.data.Capability.Ttl
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.toReferencable
import arcs.core.entity.testutil.FixtureEntities
import arcs.core.entity.testutil.FixtureEntity
import arcs.core.entity.testutil.InnerEntity
import arcs.core.testutil.runTest
import arcs.core.util.RandomBuilder
import arcs.core.util.testutil.LogRule
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.random.Random
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/** Tests for code-generated entity classes. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(Parameterized::class)
class GeneratedEntityTest(private val parameters: ParameterizedBuildFlags) {

  @get:Rule
  val rule = BuildFlagsRule.parameterized(parameters)

  companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of("STORAGE_STRING_REDUCTION")
  }

  private lateinit var idGenerator: Id.Generator
  private var currentTime: Long = 500L
  private val fixtureEntities = FixtureEntities()
  private lateinit var oldRandomBuilder: (Long?) -> Random

  @get:Rule
  val log = LogRule()

  @Before
  fun setUp() {
    idGenerator = Id.Generator.newForTest("session")
    val seed = 0
    val knownRandom = { kotlin.random.Random(seed) }

    // Set the global random builder.
    oldRandomBuilder = RandomBuilder
    RandomBuilder = { knownRandom() }
  }

  @After
  fun tearDown() {
    RandomBuilder = oldRandomBuilder
  }

  @Test
  fun createEmptyInstance() {
    val entity = FixtureEntity()

    assertThat(entity.boolField).isFalse()
    assertThat(entity.numField).isEqualTo(0.0)
    assertThat(entity.textField).isEqualTo("")
    assertThat(entity.referenceField).isNull()
    assertThat(entity.byteField).isEqualTo(0)
    assertThat(entity.shortField).isEqualTo(0)
    assertThat(entity.intField).isEqualTo(0)
    assertThat(entity.longField).isEqualTo(0L)
    assertThat(entity.charField).isEqualTo('\u0000')
    assertThat(entity.floatField).isEqualTo(0.0f)
    assertThat(entity.doubleField).isEqualTo(0.0)
    assertThat(entity.instantField).isEqualTo(ArcsInstant.ofEpochMilli(-1L))
    assertThat(entity.durationField).isEqualTo(ArcsDuration.ofMillis(0L))
    assertThat(entity.bigintField).isEqualTo(BigInt.ZERO)
    assertThat(entity.boolsField).isEmpty()
    assertThat(entity.numsField).isEmpty()
    assertThat(entity.textsField).isEmpty()
    assertThat(entity.referencesField).isEmpty()
    assertThat(entity.bytesField).isEmpty()
    assertThat(entity.shortsField).isEmpty()
    assertThat(entity.intsField).isEmpty()
    assertThat(entity.longsField).isEmpty()
    assertThat(entity.charsField).isEmpty()
    assertThat(entity.floatsField).isEmpty()
    assertThat(entity.doublesField).isEmpty()
    assertThat(entity.instantsField).isEmpty()
    assertThat(entity.durationsField).isEmpty()
    assertThat(entity.bigintsField).isEmpty()
    assertThat(entity.textListField).isEmpty()
    assertThat(entity.numListField).isEmpty()
    assertThat(entity.boolListField).isEmpty()
    assertThat(entity.inlineEntityField).isEqualTo(InnerEntity())
    assertThat(entity.inlineListField).isEmpty()
    assertThat(entity.inlinesField).isEmpty()
    assertThat(entity.referenceListField).isEmpty()
  }

  @Test
  fun createWithFieldValues() = runTest {
    val ref1 = fixtureEntities.createInnerEntityReference("bar1")
    val ref2 = fixtureEntities.createInnerEntityReference("bar2")
    val ref3 = fixtureEntities.createInnerEntityReference("bar3")
    val inline1 = fixtureEntities.generateInnerEntity()
    val inline2 = fixtureEntities.generateInnerEntity()
    val inline3 = fixtureEntities.generateInnerEntity()
    val entity = FixtureEntity(
      boolField = true,
      numField = 123.0,
      textField = "abc",
      referenceField = ref1,
      byteField = 47,
      shortField = 30000,
      intField = 1000000000,
      longField = 15000000000L,
      charField = 'A',
      floatField = 43.23f,
      doubleField = 77.66E200,
      instantField = ArcsInstant.ofEpochMilli(10.toLong()),
      durationField = ArcsDuration.ofMillis(10.toLong()),
      bigintField = BigInt.TEN,
      boolsField = setOf(false),
      numsField = setOf(456.0, 789.0),
      textsField = setOf("def", "ghi"),
      referencesField = setOf(ref2, ref3),
      bytesField = setOf(23, 34),
      shortsField = setOf(234, 345),
      intsField = setOf(234567, 345678),
      longsField = setOf(1L, 1234567890123L),
      charsField = setOf('A', 'R', 'C', 'S'),
      floatsField = setOf(2.3f, 3.4f),
      doublesField = setOf(2.3E200, 3.4E100),
      textListField = listOf("text 1", "text 2"),
      numListField = listOf(123.0, 456.0),
      boolListField = listOf(true, false, true),
      longListField = listOf(9876L, 5432L),
      instantsField = setOf(ArcsInstant.ofEpochMilli(1), ArcsInstant.ofEpochMilli(2)),
      durationsField = setOf(ArcsDuration.ofMillis(1), ArcsDuration.ofMillis(2)),
      bigintsField = setOf(BigInt.ONE, BigInt.TEN),
      inlineEntityField = inline1,
      inlineListField = listOf(inline2, inline3),
      inlinesField = setOf(inline2, inline1),
      referenceListField = listOf(ref1, ref2)
    )

    assertThat(entity.boolField).isEqualTo(true)
    assertThat(entity.numField).isEqualTo(123.0)
    assertThat(entity.textField).isEqualTo("abc")
    assertThat(entity.referenceField).isEqualTo(ref1)
    assertThat(entity.byteField).isEqualTo(47)
    assertThat(entity.shortField).isEqualTo(30000)
    assertThat(entity.intField).isEqualTo(1000000000)
    assertThat(entity.longField).isEqualTo(15000000000L)
    assertThat(entity.charField).isEqualTo('A')
    assertThat(entity.floatField).isEqualTo(43.23f)
    assertThat(entity.doubleField).isEqualTo(77.66E200)
    assertThat(entity.instantField).isEqualTo(ArcsInstant.ofEpochMilli(10.toLong()))
    assertThat(entity.durationField).isEqualTo(ArcsDuration.ofMillis(10.toLong()))
    assertThat(entity.bigintField).isEqualTo(BigInt.TEN)
    assertThat(entity.boolsField).containsExactly(false)
    assertThat(entity.numsField).containsExactly(456.0, 789.0)
    assertThat(entity.textsField).containsExactly("def", "ghi")
    assertThat(entity.referencesField).containsExactly(ref2, ref3)
    assertThat(entity.bytesField).containsExactly(23.toByte(), 34.toByte())
    assertThat(entity.shortsField).containsExactly(234.toShort(), 345.toShort())
    assertThat(entity.intsField).containsExactly(234567, 345678)
    assertThat(entity.longsField).containsExactly(1L, 1234567890123L)
    assertThat(entity.charsField).containsExactly('A', 'R', 'C', 'S')
    assertThat(entity.floatsField).containsExactly(2.3f, 3.4f)
    assertThat(entity.doublesField).containsExactly(2.3E200, 3.4E100)
    assertThat(entity.textListField).containsExactly("text 1", "text 2")
    assertThat(entity.numListField).containsExactly(123.0, 456.0)
    assertThat(entity.boolListField).containsExactly(true, false, true)
    assertThat(entity.instantsField).containsExactly(
      ArcsInstant.ofEpochMilli(1),
      ArcsInstant.ofEpochMilli(2)
    )
    assertThat(entity.durationsField).containsExactly(
      ArcsDuration.ofMillis(1),
      ArcsDuration.ofMillis(2)
    )
    assertThat(entity.bigintsField).containsExactly(BigInt.ONE, BigInt.TEN)
    assertThat(entity.inlineEntityField).isEqualTo(inline1)
    assertThat(entity.inlineListField).containsExactly(inline2, inline3)
    assertThat(entity.inlinesField).containsExactly(inline2, inline1)
    assertThat(entity.referenceListField).containsExactly(ref1, ref2)
  }

  @Test
  fun ensureEntityFields() {

    val entity = FixtureEntity()
    assertThat(entity.entityId).isNull()

    entity.ensureEntityFields(idGenerator, "handle", FakeTime(currentTime))
    val entityId = entity.entityId

    // Check that the entity ID has been set to *something*.
    assertThat(entityId).isNotNull()
    assertThat(entityId).isNotEmpty()
    assertThat(entityId).isNotEqualTo(NO_REFERENCE_ID)

    val creationTimestamp = entity.serialize().creationTimestamp

    assertThat(creationTimestamp).isEqualTo(currentTime)

    // Calling it again doesn't overwrite id and timestamp.
    entity.ensureEntityFields(
      idGenerator,
      "something-else",
      FakeTime(currentTime + 10)
    )
    assertThat(entity.entityId).isEqualTo(entityId)
    assertThat(entity.serialize().creationTimestamp).isEqualTo(creationTimestamp)
  }

  @Test
  fun expiryTimestamp() {
    val entity = FixtureEntity()
    entity.ensureEntityFields(
      idGenerator,
      "handle",
      FakeTime(currentTime),
      Ttl.Minutes(1)
    )
    val expirationTimestamp = entity.serialize().expirationTimestamp

    assertThat(expirationTimestamp).isEqualTo(currentTime + 60000) // 1 minute = 60,000 ms.
  }

  @Test
  fun copy() = runTest {
    val ref1 = fixtureEntities.createInnerEntityReference("bar1")
    val ref2 = fixtureEntities.createInnerEntityReference("bar2")
    val ref3 = fixtureEntities.createInnerEntityReference("bar3")
    val inline1 = fixtureEntities.generateInnerEntity()
    val inline2 = fixtureEntities.generateInnerEntity()
    val inline3 = fixtureEntities.generateInnerEntity()
    val entity = FixtureEntity(
      boolField = true,
      numField = 123.0,
      textField = "abc",
      referenceField = ref1,
      byteField = 47,
      shortField = 30000,
      intField = 1000000000,
      longField = 15000000000L,
      charField = 'A',
      floatField = 43.23f,
      doubleField = 77.66E200,
      instantField = ArcsInstant.ofEpochMilli(10.toLong()),
      durationField = ArcsDuration.ofMillis(10.toLong()),
      bigintField = BigInt.TEN,
      boolsField = setOf(false),
      numsField = setOf(456.0, 789.0),
      textsField = setOf("def", "ghi"),
      referencesField = setOf(ref2, ref3),
      bytesField = setOf(23, 34),
      shortsField = setOf(234, 345),
      intsField = setOf(234567, 345678),
      longsField = setOf(1L, 1234567890123L),
      charsField = setOf('A', 'R', 'C', 'S'),
      floatsField = setOf(2.3f, 3.4f),
      doublesField = setOf(2.3E200, 3.4E100),
      textListField = listOf("text 1", "text 2"),
      numListField = listOf(123.0, 456.0),
      boolListField = listOf(true, false, true),
      instantsField = setOf(ArcsInstant.ofEpochMilli(1), ArcsInstant.ofEpochMilli(2)),
      durationsField = setOf(ArcsDuration.ofMillis(1), ArcsDuration.ofMillis(2)),
      bigintsField = setOf(BigInt.ONE, BigInt.TEN),
      inlineEntityField = inline1,
      inlineListField = listOf(inline2, inline3),
      inlinesField = setOf(inline2, inline1),
      referenceListField = listOf(ref1, ref2)
    )

    // Copying an unidentified entity should give an exact copy of the entity.
    assertThat(entity.copy()).isEqualTo(entity)

    // Copying an identified entity should reset the ID.
    entity.identify()
    val copy1 = entity.copy()

    assertThat(copy1.entityId).isNull()
    assertThat(copy1).isNotEqualTo(entity)

    // Copying an entity with replacement fields should overwrite those fields in the copy.
    val copy2 = entity.copy(
      boolField = false,
      numField = 456.0,
      textField = "xyz",
      referenceField = ref2,
      byteField = 25,
      shortField = -20000,
      intField = -900000000,
      longField = -16000000000L,
      charField = 'a',
      floatField = 23.43f,
      doubleField = 66.77E100,
      instantField = ArcsInstant.ofEpochMilli(20.toLong()),
      durationField = ArcsDuration.ofMillis(20.toLong()),
      bigintField = BigInt.ONE,
      boolsField = setOf(true),
      numsField = setOf(111.0, 222.0),
      textsField = setOf("aaa", "bbb"),
      referencesField = setOf(ref1, ref3),
      bytesField = setOf(45, 56),
      shortsField = setOf(456, 567),
      intsField = setOf(456789, 567890),
      longsField = setOf(1L, 2345678901234L),
      charsField = setOf('R', 'O', 'C', 'K', 'S'),
      floatsField = setOf(4.5f, 5.6f),
      doublesField = setOf(4.5E50, 5.6E60),
      textListField = listOf("text 3", "text 4"),
      numListField = listOf(789.0, 111.0),
      boolListField = listOf(false, false, false),
      instantsField = setOf(ArcsInstant.ofEpochMilli(6), ArcsInstant.ofEpochMilli(7)),
      durationsField = setOf(ArcsDuration.ofMillis(6), ArcsDuration.ofMillis(7)),
      bigintsField = setOf(BigInt.ZERO, BigInt.TEN),
      inlineEntityField = inline2,
      inlineListField = listOf(inline3, inline1),
      inlinesField = setOf(inline3, inline2),
      referenceListField = listOf(ref3, ref2)
    )

    assertThat(copy2.entityId).isNull()
    assertThat(copy2.boolField).isFalse()
    assertThat(copy2.numField).isEqualTo(456.0)
    assertThat(copy2.textField).isEqualTo("xyz")
    assertThat(copy2.referenceField).isEqualTo(ref2)
    assertThat(copy2.byteField).isEqualTo(25)
    assertThat(copy2.shortField).isEqualTo(-20000)
    assertThat(copy2.intField).isEqualTo(-900000000)
    assertThat(copy2.longField).isEqualTo(-16000000000L)
    assertThat(copy2.charField).isEqualTo('a')
    assertThat(copy2.floatField).isEqualTo(23.43f)
    assertThat(copy2.doubleField).isEqualTo(66.77E100)
    assertThat(copy2.instantField).isEqualTo(ArcsInstant.ofEpochMilli(20.toLong()))
    assertThat(copy2.durationField).isEqualTo(ArcsDuration.ofMillis(20.toLong()))
    assertThat(copy2.bigintField).isEqualTo(BigInt.ONE)
    assertThat(copy2.boolsField).containsExactly(true)
    assertThat(copy2.numsField).containsExactly(111.0, 222.0)
    assertThat(copy2.textsField).containsExactly("aaa", "bbb")
    assertThat(copy2.referencesField).containsExactly(ref1, ref3)
    assertThat(copy2.bytesField).containsExactly(45.toByte(), 56.toByte())
    assertThat(copy2.shortsField).containsExactly(456.toShort(), 567.toShort())
    assertThat(copy2.intsField).containsExactly(456789, 567890)
    assertThat(copy2.longsField).containsExactly(1L, 2345678901234L)
    assertThat(copy2.charsField).containsExactly('R', 'O', 'C', 'K', 'S')
    assertThat(copy2.floatsField).containsExactly(4.5f, 5.6f)
    assertThat(copy2.doublesField).containsExactly(4.5E50, 5.6E60)
    assertThat(copy2.textListField).containsExactly("text 3", "text 4")
    assertThat(copy2.numListField).containsExactly(789.0, 111.0)
    assertThat(copy2.boolListField).containsExactly(false, false, false)
    assertThat(copy2.instantsField).containsExactly(
      ArcsInstant.ofEpochMilli(6),
      ArcsInstant.ofEpochMilli(7)
    )
    assertThat(copy2.durationsField).containsExactly(
      ArcsDuration.ofMillis(6),
      ArcsDuration.ofMillis(7)
    )
    assertThat(copy2.bigintsField).containsExactly(BigInt.ZERO, BigInt.TEN)
    assertThat(copy2.inlineEntityField).isEqualTo(inline2)
    assertThat(copy2.inlineListField).containsExactly(inline3, inline1)
    assertThat(copy2.inlinesField).containsExactly(inline3, inline2)
    assertThat(copy2.referenceListField).containsExactly(ref3, ref2)
  }

  @Test
  fun serialize_roundTrip() = runTest {
    val ref1 = fixtureEntities.createInnerEntityReference("bar1")
    val ref2 = fixtureEntities.createInnerEntityReference("bar2")
    val ref3 = fixtureEntities.createInnerEntityReference("bar3")
    val inline1 = fixtureEntities.generateInnerEntity()
    val inline2 = fixtureEntities.generateInnerEntity()
    val inline3 = fixtureEntities.generateInnerEntity()
    val entity = FixtureEntity(
      boolField = true,
      numField = 123.0,
      textField = "abc",
      referenceField = ref1,
      byteField = 47,
      shortField = 30000,
      intField = 1000000000,
      longField = 15000000000L,
      charField = 'A',
      floatField = 43.23f,
      doubleField = 77.66E200,
      instantField = ArcsInstant.ofEpochMilli(10.toLong()),
      durationField = ArcsDuration.ofMillis(10.toLong()),
      bigintField = BigInt.TEN,
      boolsField = setOf(false),
      numsField = setOf(456.0, 789.0),
      textsField = setOf("def", "ghi"),
      referencesField = setOf(ref2, ref3),
      bytesField = setOf(23, 34),
      shortsField = setOf(234, 345),
      intsField = setOf(234567, 345678),
      longsField = setOf(1L, 1234567890123L),
      charsField = setOf('A', 'R', 'C', 'S'),
      floatsField = setOf(2.3f, 3.4f),
      doublesField = setOf(2.3E200, 3.4E100),
      textListField = listOf("text 1", "text 2"),
      numListField = listOf(123.0, 456.0),
      boolListField = listOf(true, false, true),
      longListField = listOf(9876L, 5432L),
      instantsField = setOf(ArcsInstant.ofEpochMilli(1), ArcsInstant.ofEpochMilli(2)),
      durationsField = setOf(ArcsDuration.ofMillis(1), ArcsDuration.ofMillis(2)),
      bigintsField = setOf(BigInt.ONE, BigInt.TEN),
      inlineEntityField = inline1,
      inlineListField = listOf(inline2, inline3),
      inlinesField = setOf(inline2, inline1),
      referenceListField = listOf(ref1, ref3)
    )
    val entityId = entity.identify()
    val rawEntity = entity.serialize()
    val expected =
      RawEntity(
        entityId,
        singletons = mapOf(
          "textField" to "abc".toReferencable(),
          "numField" to 123.0.toReferencable(),
          "boolField" to true.toReferencable(),
          "byteField" to 47.toByte().toReferencable(),
          "shortField" to 30000.toShort().toReferencable(),
          "intField" to 1000000000.toReferencable(),
          "longField" to 15000000000L.toReferencable(),
          "charField" to 'A'.toReferencable(),
          "floatField" to 43.23f.toReferencable(),
          "doubleField" to 77.66E200.toReferencable(),
          "instantField" to ArcsInstant.ofEpochMilli(10.toLong()).toReferencable(),
          "durationField" to ArcsDuration.ofMillis(10.toLong()).toReferencable(),
          "bigintField" to BigInt.TEN.toReferencable(),
          "textListField" to listOf(
            "text 1".toReferencable(),
            "text 2".toReferencable()
          ).toReferencable(FieldType.ListOf(FieldType.Text)),
          "numListField" to listOf(123.0.toReferencable(), 456.0.toReferencable()).toReferencable(
            FieldType.ListOf(FieldType.Number)
          ),
          "boolListField" to listOf(
            true.toReferencable(),
            false.toReferencable(),
            true.toReferencable()
          ).toReferencable(FieldType.ListOf(FieldType.Boolean)),
          "longListField" to listOf(9876L.toReferencable(), 5432L.toReferencable()).toReferencable(
            FieldType.ListOf(FieldType.Long)
          ),
          "inlineEntityField" to inline1.serialize(),
          "inlineListField" to listOf(inline2.serialize(), inline3.serialize()).toReferencable(
            FieldType.ListOf(FieldType.InlineEntity(InnerEntity.SCHEMA.hash))
          ),
          "referenceField" to ref1.toReferencable(),
          "referenceListField" to ReferencableList(
            listOf(
              ref1.toReferencable(),
              ref3.toReferencable()
            ),
            FieldType.ListOf(FieldType.EntityRef(InnerEntity.SCHEMA.hash))
          ),
          "hardReferenceField" to null,
          "foreignField" to null
        ),
        collections = mapOf(
          "textsField" to setOf("def".toReferencable(), "ghi".toReferencable()),
          "numsField" to setOf(456.0.toReferencable(), 789.0.toReferencable()),
          "boolsField" to setOf(false.toReferencable()),
          "bytesField" to setOf(23.toByte().toReferencable(), 34.toByte().toReferencable()),
          "shortsField" to setOf(
            234.toShort().toReferencable(),
            345.toShort().toReferencable()
          ),
          "intsField" to setOf(234567.toReferencable(), 345678.toReferencable()),
          "longsField" to setOf(1L.toReferencable(), 1234567890123L.toReferencable()),
          "charsField" to setOf(
            'A'.toReferencable(),
            'R'.toReferencable(),
            'C'.toReferencable(),
            'S'.toReferencable()
          ),
          "floatsField" to setOf(2.3f.toReferencable(), 3.4f.toReferencable()),
          "doublesField" to setOf(2.3E200.toReferencable(), 3.4E100.toReferencable()),
          "instantsField" to setOf(
            ArcsInstant.ofEpochMilli(1).toReferencable(),
            ArcsInstant.ofEpochMilli(2).toReferencable()
          ),
          "durationsField" to setOf(
            ArcsDuration.ofMillis(1).toReferencable(),
            ArcsDuration.ofMillis(2).toReferencable()
          ),
          "bigintsField" to setOf(BigInt.ONE.toReferencable(), BigInt.TEN.toReferencable()),
          "inlinesField" to setOf(inline2.serialize(), inline1.serialize()),
          "referencesField" to setOf(ref2.toReferencable(), ref3.toReferencable())
        ),
        creationTimestamp = 500L
      )

    assertThat(rawEntity).isEqualTo(expected)
    assertThat(FixtureEntity.deserialize(rawEntity)).isEqualTo(entity)
  }

  @Test
  fun schemaRegistry() {
    // The entity class should have registered itself statically.
    val hash = FixtureEntity.SCHEMA.hash

    assertThat(SchemaRegistry.getSchema(hash)).isEqualTo(FixtureEntity.SCHEMA)
  }

  /** Generates and returns an ID for the entity. */
  private fun FixtureEntity.identify(): String {
    assertThat(entityId).isNull()
    ensureEntityFields(idGenerator, "handleName", FakeTime(currentTime))
    assertThat(entityId).isNotNull()
    return entityId!!
  }
}
