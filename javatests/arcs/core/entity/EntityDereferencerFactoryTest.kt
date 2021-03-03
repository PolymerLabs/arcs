package arcs.core.entity

import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.toReferencable
import arcs.core.storage.RawEntityDereferencer
import arcs.core.storage.RawReference
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.keys.ForeignStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class EntityDereferencerFactoryTest {
  @Before
  fun setUp() {
    StorageKeyManager.GLOBAL_INSTANCE.addParser(DummyStorageKey)
  }

  @After
  fun tearDown() {
    StorageKeyManager.GLOBAL_INSTANCE.reset()
    SchemaRegistry.clearForTest()
  }

  /**
   * Test using an [EntityDereferencerFactory] to create an [EntityDereferencer] succeeds. Also
   * verify that when you call create a second time for the same schema, the same instance of the
   * [EntityDereferencer] is returned.
   */
  @Test
  fun entityDereferencerFactory_create_succeeds() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )

    val dereferencer = factory.create(SCHEMA1)
    val dereferencerCopy = factory.create(SCHEMA1)
    val dereferencer2 = factory.create(SCHEMA2)

    assertThat(dereferencer).isSameInstanceAs(dereferencerCopy)
    assertThat(dereferencer).isNotEqualTo(dereferencer2)
  }

  /**
   * Test that calling the [injectDereferencers] method with a null value does not throw an error.
   */
  @Test
  fun entityDereferencerFactory_injectDereferencers_nullValue() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )

    val v = factory.injectDereferencers(SCHEMA1, null)

    assertThat(v).isEqualTo(Unit)
  }

  /**
   * Test that calling the [injectDereferencers] method with a reference creates, stores, and
   * injects the correct [EntityDerefencer].
   */
  @Test
  fun entityDereferencerFactory_injectDereferencers_reference() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )
    val ref = RawReference(
      "id",
      RamDiskStorageKey("key"),
      VersionMap("foo" to 1)
    )

    factory.injectDereferencers(SCHEMA1, ref)
    val dereferencer = factory.create(SCHEMA1)

    assertThat(ref.dereferencer).isSameInstanceAs(dereferencer)
  }

  /**
   * Test that calling the [injectDereferencers] method with a foreign reference creates the
   * correct [ForeignEntityDereferencer].
   */
  @Test
  fun entityDereferencerFactory_injectDereferencers_foreignReference() {
    val foreignReferenceChecker = ForeignReferenceCheckerImpl(mapOf())
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      foreignReferenceChecker
    )
    val ref = RawReference(
      "id",
      ForeignStorageKey("fooBar"),
      VersionMap("foo" to 1)
    )

    factory.injectDereferencers(SCHEMA1, ref)
    val dereferencer = ForeignEntityDereferencer(SCHEMA1, foreignReferenceChecker)

    assertThat(ref.dereferencer).isEqualTo(dereferencer)
  }

  /**
   * Test that calling the [injectDereferencers] method with a set of references creates the
   * correct [ForeignEntityDereferencer]s.
   */
  @Test
  fun entityDereferencerFactory_injectDereferencers_set() {
    val foreignReferenceChecker = ForeignReferenceCheckerImpl(mapOf())
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      foreignReferenceChecker
    )
    val ref1 = RawReference(
      "id",
      ForeignStorageKey("ref"),
      VersionMap("foo" to 1)
    )
    val ref2 = createReference("id2", "ref2")
    val ref3 = createReference("id3", "ref3")

    factory.injectDereferencers(SCHEMA1, setOf(ref1, ref2, ref3))
    val dereferencer1 = ForeignEntityDereferencer(SCHEMA1, foreignReferenceChecker)
    val dereferencer2 = factory.create(SCHEMA1)

    assertThat(ref1.dereferencer).isEqualTo(dereferencer1)
    assertThat(ref2.dereferencer).isEqualTo(dereferencer2)
    assertThat(ref3.dereferencer).isEqualTo(dereferencer2)
  }

  /**
   * Test that calling the [injectDereferencers] method with a [ReferencableList] creates the
   * correct [ForeignEntityDereferencer]s.
   */
  @Test
  fun entityDereferencerFactory_injectDereferencers_referencableList() {
    val foreignReferenceChecker = ForeignReferenceCheckerImpl(mapOf())
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      foreignReferenceChecker
    )
    val ref1 = RawReference(
      "id",
      ForeignStorageKey("ref"),
      VersionMap("foo" to 1)
    )
    val ref2 = createReference("id2", "ref2")
    val ref3 = createReference("id3", "ref3")
    val refList = ReferencableList(listOf(ref1, ref2, ref3), FieldType.EntityRef("koala"))

    factory.injectDereferencers(SCHEMA1, refList)
    val dereferencer1 = ForeignEntityDereferencer(SCHEMA1, foreignReferenceChecker)
    val dereferencer2 = factory.create(SCHEMA1)

    assertThat(ref1.dereferencer).isEqualTo(dereferencer1)
    assertThat(ref2.dereferencer).isEqualTo(dereferencer2)
    assertThat(ref3.dereferencer).isEqualTo(dereferencer2)
  }

  /**
   * Test that calling the [injectDereferencers] method with a combination of types creates the
   * correct [ForeignEntityDereferencer]s.
   */
  @Test
  fun entityDereferencerFactory_injectDereferencers_complex() {
    val foreignReferenceChecker = ForeignReferenceCheckerImpl(mapOf())
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      foreignReferenceChecker
    )
    val ref1 = RawReference(
      "id",
      ForeignStorageKey("ref"),
      VersionMap("foo" to 1)
    )
    val ref2 = createReference("id2", "ref2")
    val ref3 = createReference("id3", "ref3")
    val refSet = setOf(
      ReferencableList(listOf(ref1, ref2), FieldType.EntityRef("koala")),
      ReferencableList(listOf(ref3), FieldType.EntityRef("koala"))
    )

    factory.injectDereferencers(SCHEMA1, refSet)
    val dereferencer1 = ForeignEntityDereferencer(SCHEMA1, foreignReferenceChecker)
    val dereferencer2 = factory.create(SCHEMA1)

    assertThat(ref1.dereferencer).isEqualTo(dereferencer1)
    assertThat(ref2.dereferencer).isEqualTo(dereferencer2)
    assertThat(ref3.dereferencer).isEqualTo(dereferencer2)
  }

  /**
   * Test that calling the [injectDereferencers] method with a [RawEntity] that contains
   * [FieldType.EntityRef]s in both the collections and singletons creates the correct
   * [RawEntityDereferencer]s.
   */
  @Test
  fun entityDereferencerFactory_injectField_entityRef() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )
    // Create and register schemas
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("foo" to FieldType.EntityRef("koala")),
        collections = mapOf("bar" to FieldType.EntityRef("kangaroo"))
      ),
      "abc"
    )
    val koalaSchema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("fooByte" to FieldType.Byte),
        collections = emptyMap()
      ),
      "koala"
    )
    val kangarooSchema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("barInt" to FieldType.Int),
        collections = emptyMap()
      ),
      "kangaroo"
    )
    SchemaRegistry.register(schema)
    SchemaRegistry.register(koalaSchema)
    SchemaRegistry.register(kangarooSchema)
    // Create References
    val koalaRef = createReference("id", "koala-key")
    val kangarooRef = createReference("id2", "kangaroo-key")
    // Create the RawEntity
    val entity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to koalaRef),
      collections = mapOf("bar" to setOf(kangarooRef))
    )

    // Verify the Reference dereferencers start null
    assertThat(koalaRef.dereferencer).isNull()
    assertThat(kangarooRef.dereferencer).isNull()
    // Inject the dereferencers into the entity.
    factory.injectDereferencers(schema, entity)
    // Find the dereferencers.
    val koalaDereferencer = factory.create(koalaSchema)
    val kangarooDereferencer = factory.create(kangarooSchema)

    // Verify the factory's dereferencers are the same as those injected.
    assertThat(koalaRef.dereferencer).isEqualTo(koalaDereferencer)
    assertThat(kangarooRef.dereferencer).isEqualTo(kangarooDereferencer)
  }

  /**
   * Test that calling the [injectDereferencers] method with a [RawEntity] that contains
   * [FieldType.InlineEntity]s creates the correct [RawEntityDereferencer]s.
   */
  @Test
  fun entityDereferencerFactory_injectField_inlineEntity() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )
    // Create and register schemas
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("foo" to FieldType.InlineEntity("koala")),
        collections = mapOf("bar" to FieldType.InlineEntity("kangaroo"))
      ),
      "abc"
    )
    val koalaSchema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("bear" to FieldType.Text),
        collections = mapOf("child" to FieldType.EntityRef("joey2"))
      ),
      "koala"
    )
    val kangarooSchema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("marsupial" to FieldType.EntityRef("joey")),
        collections = emptyMap()
      ),
      "kangaroo"
    )
    val joeySchema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("age" to FieldType.Text),
        collections = mapOf("parents" to FieldType.Text)
      ),
      "joey"
    )
    val joey2Schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("age" to FieldType.Text),
        collections = mapOf("parents" to FieldType.Text)
      ),
      "joey2"
    )
    SchemaRegistry.register(schema)
    SchemaRegistry.register(koalaSchema)
    SchemaRegistry.register(kangarooSchema)
    SchemaRegistry.register(joeySchema)
    // Create Reference
    val joeyRef = createReference("joey-id", "joey-key")
    val joey2Ref = createReference("joey2-id", "joey2-key")
    // Create the RawEntities
    val koalaEntity = RawEntity(
      "id",
      singletons = mapOf("bear" to "I am not".toReferencable()),
      collections = mapOf("child" to setOf(joey2Ref))
    )
    val kangarooEntity = RawEntity(
      "id2",
      singletons = mapOf("marsupial" to joeyRef),
      collections = emptyMap()
    )
    val entity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to koalaEntity),
      collections = mapOf("bar" to setOf(kangarooEntity))
    )

    // Verify the Reference dereferencers start null
    assertThat(joeyRef.dereferencer).isNull()
    assertThat(joey2Ref.dereferencer).isNull()
    // Inject the dereferencers into the entity.
    factory.injectDereferencers(schema, entity)
    // Find the dereferencers.
    val joeyDereferencer = factory.create(joeySchema)
    val joey2Dereferencer = factory.create(joey2Schema)

    // Verify the factory's dereferencers are the same as those injected.
    assertThat(joeyRef.dereferencer).isEqualTo(joeyDereferencer)
    assertThat(joey2Ref.dereferencer).isEqualTo(joey2Dereferencer)
  }

  /**
   * Test that calling the [injectDereferencers] method with a [RawEntity] that contains
   * a [List] creates the correct [RawEntityDereferencer]s.
   */
  @Test
  fun entityDereferencerFactory_injectField_listOf() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )
    // Create and register schemas
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("foo" to FieldType.ListOf(FieldType.Text)),
        collections = mapOf("bar" to FieldType.ListOf(FieldType.EntityRef("koala")))
      ),
      "abc"
    )
    val koalaSchema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("bear" to FieldType.Text),
        collections = emptyMap()
      ),
      "koala"
    )

    SchemaRegistry.register(schema)
    SchemaRegistry.register(koalaSchema)

    // Create Reference
    val koalaRef = createReference("koala-id", "koala-key")

    val entity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to "fooBar".toReferencable()),
      collections = mapOf("bar" to setOf(koalaRef))
    )

    // Verify the Reference dereferencers start null
    assertThat(koalaRef.dereferencer).isNull()
    // Inject the dereferencers into the entity.
    factory.injectDereferencers(schema, entity)
    // Find the dereferencers.
    val koalaDereferencer = factory.create(koalaSchema)

    // Verify the factory's dereferencers are the same as those injected.
    assertThat(koalaRef.dereferencer).isEqualTo(koalaDereferencer)
  }

  /**
   * Test that calling the [injectDereferencers] method with a [RawEntity] that contains
   * embedded [List]s creates the correct [RawEntityDereferencer]s.
   */
  @Test
  fun entityDereferencerFactory_injectField_embeddedLists() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )
    // Create and register schemas
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf(
          "foo" to FieldType.ListOf(FieldType.ListOf(FieldType.EntityRef("koala")))
        ),
        collections = mapOf("bar" to FieldType.ListOf(FieldType.Text))
      ),
      "abc"
    )
    val koalaSchema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("bear" to FieldType.Text),
        collections = mapOf("child" to FieldType.EntityRef("joey"))
      ),
      "koala"
    )

    SchemaRegistry.register(schema)
    SchemaRegistry.register(koalaSchema)

    // Create Reference
    val koalaRef = createReference("koala-id", "koala-key")

    // Create the RawEntity
    val entity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to koalaRef),
      collections = mapOf("bar" to setOf("hi".toReferencable()))
    )

    // Verify the Reference dereferencers start null
    assertThat(koalaRef.dereferencer).isNull()
    // Inject the dereferencers into the entity.
    factory.injectDereferencers(schema, entity)
    // Find the dereferencers.
    val joeyDereferencer = factory.create(koalaSchema)

    // Verify the factory's dereferencers are the same as those injected.
    assertThat(koalaRef.dereferencer).isEqualTo(joeyDereferencer)
  }

  /**
   * Test that when [injectField] is called with an unregistered [Schema], the correct error is
   * thrown.
   */
  @Test
  fun entityDereferencerFactory_injectField_unregisteredSchema_throwsError() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )
    // Create and register schemas
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("foo" to FieldType.EntityRef("koala")),
        collections = mapOf("bar" to FieldType.Text)
      ),
      "abc"
    )
    SchemaRegistry.register(schema)

    // Create Reference
    val koalaRef = createReference("id", "koala-key")

    // Create the RawEntity
    val entity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to koalaRef),
      collections = mapOf("bar" to setOf("boo".toReferencable()))
    )

    // Get error from inject the dereferencers into the entity.
    val e = assertFailsWith<java.util.NoSuchElementException> {
      factory.injectDereferencers(schema, entity)
    }

    // Verify the correct message was given with the error.
    assertThat(e)
      .hasMessageThat()
      .isEqualTo(
        "Schema hash 'koala' not found in SchemaRegistry."
      )
  }

  /**
   * Test when [EntityDereferencerFactory.injectField] receives mismatched [FieldType] and
   * [FieldValue].
   */
  @Test
  fun entityDereferencerFactory_injectField_misMatchedFieldType() {
    val factory = EntityDereferencerFactory(
      testStorageEndpointManager(),
      ForeignReferenceCheckerImpl(mapOf())
    )
    // Create and register schemas
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("foo" to FieldType.InlineEntity("koala")),
        collections = emptyMap()
      ),
      "abc"
    )
    val koalaSchema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("bear" to FieldType.Text),
        collections = emptyMap()
      ),
      "koala"
    )

    SchemaRegistry.register(schema)
    SchemaRegistry.register(koalaSchema)
    // Create Reference
    val koalaRef = createReference("id", "koala-key")

    // Create the RawEntity
    val entity = RawEntity(
      id = "an-id",
      singletons = mapOf("foo" to koalaRef),
      collections = emptyMap()
    )

    // Verify the Reference dereferencers start null
    assertThat(koalaRef.dereferencer).isNull()
    // Inject the dereferencers into the entity.
    factory.injectDereferencers(schema, entity)
    // Find the dereferencers.
    val koalaDereferencer = factory.create(koalaSchema)

    // Verify the factory's dereferencer is the same as the one injected.
    assertThat(koalaRef.dereferencer).isEqualTo(koalaDereferencer)
  }

  /**
   * Test when a [ForeignEntityDereferencer] tries to dereference a reference the correct error is
   * thrown.
   */
  @Test
  fun foreignEntityDereferencer_dereference_throwsError() = runBlockingTest {
    // Create the needed values.
    val foreignReferenceChecker = ForeignReferenceCheckerImpl(mapOf())
    val ref = RawReference(
      "id",
      DummyStorageKey("fooBar"),
      VersionMap("foo" to 1)
    )
    val dereferencer = ForeignEntityDereferencer(SCHEMA1, foreignReferenceChecker)

    // Get error from trying to dereference a reference with a ForeignEntityDereferencer.
    val e = assertFailsWith<java.lang.IllegalStateException> {
      dereferencer.dereference(ref)
    }

    // Verify the correct message was given with the error.
    assertThat(e)
      .hasMessageThat()
      .isEqualTo(
        "ForeignEntityDereferencer can only be used for foreign references."
      )
  }

  /**
   * Test when the [ForeignEntityDereferencer] has an invalid [ForeignReference], dereference
   * returns null.
   */
  @Test
  fun foreignEntityDereferencer_dereference_invalidCheck() = runBlockingTest {
    val schema = Schema(
      emptySet(),
      SchemaFields(emptyMap(), emptyMap()),
      "abc"
    )
    val foreignReferenceChecker = ForeignReferenceCheckerImpl(
      mapOf(schema to { false })
    )
    val ref = RawReference(
      "id",
      ForeignStorageKey("fooBar"),
      VersionMap("foo" to 1)
    )
    val dereferencer = ForeignEntityDereferencer(schema, foreignReferenceChecker)

    val d = dereferencer.dereference(ref)
    assertThat(d).isNull()
  }

  /**
   * Test when everything is set properly, the [ForeignEntityDereferencer] returns the appropriate
   * entity.
   */
  @Test
  fun foreignEntityDereferencer_dereference_succeeds() = runBlockingTest {
    val schema = Schema(
      emptySet(),
      SchemaFields(emptyMap(), emptyMap()),
      "abc"
    )
    val foreignReferenceChecker = ForeignReferenceCheckerImpl(
      mapOf(schema to { true })
    )
    val ref = RawReference(
      "id",
      ForeignStorageKey("fooBar"),
      VersionMap("foo" to 1)
    )
    val dereferencer = ForeignEntityDereferencer(schema, foreignReferenceChecker)

    val d = dereferencer.dereference(ref)
    val expectedEntity = RawEntity(id = "id")
    assertThat(d).isEqualTo(expectedEntity)
  }

  private fun createReference(id: String, storageKey: String) = RawReference(
    id,
    DummyStorageKey(storageKey),
    VersionMap("foo" to 1)
  )

  companion object {
    private val SCHEMA1 = Schema(
      emptySet(),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "abc"
    )

    private val SCHEMA2 = Schema(
      emptySet(),
      SchemaFields(mapOf("foo" to FieldType.Number), emptyMap()),
      "def"
    )
  }
}
