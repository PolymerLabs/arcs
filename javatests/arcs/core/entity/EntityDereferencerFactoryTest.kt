package arcs.core.entity

import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.storage.testutil.testStorageEndpointManager
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import arcs.core.storage.Reference
import arcs.core.storage.keys.ForeignStorageKey
import arcs.core.storage.keys.RamDiskStorageKey

@RunWith(JUnit4::class)
class EntityDereferencerFactoryTest {

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
}
