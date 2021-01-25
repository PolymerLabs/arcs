package arcs.core.entity

import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.toReferencable
import arcs.core.storage.RawEntityDereferencer
import arcs.core.storage.testutil.testStorageEndpointManager
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import arcs.core.storage.Reference
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.keys.ForeignStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.DummyStorageKey
import org.junit.After
import org.junit.Before
import kotlin.test.assertFailsWith

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
    val schema = Schema(
      emptySet(),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "abc"
    )
    val schema2 = Schema(
      emptySet(),
      SchemaFields(mapOf("foo" to FieldType.Number), emptyMap()),
      "def"
    )

    val dereferencer = factory.create(schema)
    val dereferencerCopy = factory.create(schema)
    val dereferencer2 = factory.create(schema2)

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
    val schema = Schema(
      emptySet(),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "abc"
    )
    val v = factory.injectDereferencers(schema, null)

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
    val schema = Schema(
      emptySet(),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "abc"
    )
    val ref = Reference(
      "id",
      RamDiskStorageKey("key"),
      VersionMap("foo" to 1)
    )

    factory.injectDereferencers(schema, ref)
    val dereferencer = factory.create(schema)

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
    val schema = Schema(
      emptySet(),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "abc"
    )
    val ref = Reference(
      "id",
      ForeignStorageKey("fooBar"),
      VersionMap("foo" to 1)
    )

    factory.injectDereferencers(schema, ref)
    val dereferencer = ForeignEntityDereferencer(schema, foreignReferenceChecker)

    assertThat(ref.dereferencer).isEqualTo(dereferencer)
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
    val koalaRef = Reference(
      "id",
      DummyStorageKey("koala-key"),
      VersionMap("foo" to 1)
    )
    val kangarooRef = Reference(
      "id2",
      DummyStorageKey("kangaroo-key"),
      VersionMap("kanga" to 1)
    )
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
    val joeyRef = Reference(
      "joey-id",
      DummyStorageKey("joey-key"),
      VersionMap("joey" to 1)
    )
    val joey2Ref = Reference(
      "joey2-id",
      DummyStorageKey("joey2-key"),
      VersionMap("joey2" to 1)
    )
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
    val koalaRef = Reference(
      "koala-id",
      DummyStorageKey("koala-key"),
      VersionMap("koala" to 1)
    )

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
    val koalaRef = Reference(
      "koala-id",
      DummyStorageKey("koala-key"),
      VersionMap("koala" to 1)
    )

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

    // Create References
    val koalaRef = Reference(
      "id",
      DummyStorageKey("koala-key"),
      VersionMap("foo" to 1)
    )

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
}
