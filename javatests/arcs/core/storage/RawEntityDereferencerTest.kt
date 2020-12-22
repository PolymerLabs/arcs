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

package arcs.core.storage

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtEntity.Reference.Companion.buildReference
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.toReferencable
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE", "MapGetWithNotNullAssertionOperator")
@RunWith(JUnit4::class)
class RawEntityDereferencerTest {
  // Self-referential schema.
  private val schema = Schema(
    emptySet(),
    SchemaFields(
      singletons = mapOf(
        "name" to FieldType.Text,
        "sibling" to FieldType.EntityRef("abc")
      ),
      collections = emptyMap()
    ),
    "abc"
  )
  private val backingKey = RamDiskStorageKey("people")
  private lateinit var aliceDriver: Driver<CrdtEntity.Data>
  private lateinit var bobDriver: Driver<CrdtEntity.Data>

  // TODO: Test with an activation factory in android-specific tests.
  private val dereferencer = RawEntityDereferencer(
    schema,
    testStorageEndpointManager()
  )
  private val referenceBuilder = { refable: Referencable ->
    if (refable is Reference) refable
    else buildReference(refable)
  }

  private val alice = RawEntity(
    "aliceId",
    singletons = mapOf(
      "name" to "Alice Entity".toReferencable(),
      "sibling" to Reference("bobId", backingKey, VersionMap())
        .also { it.dereferencer = this.dereferencer }
    ),
    collections = emptyMap()
  )
  private val bob = RawEntity(
    "bobId",
    singletons = mapOf(
      "name" to "Bob Entity".toReferencable(),
      "sibling" to Reference("aliceId", backingKey, VersionMap())
        .also { it.dereferencer = this.dereferencer }
    ),
    collections = emptyMap()
  )

  @Before
  fun setUp() = runBlocking {
    RamDisk.clear()
    DefaultDriverFactory.update(
      RamDiskDriverProvider()
    )

    aliceDriver = DefaultDriverFactory.get().getDriver(
      backingKey.childKeyWithComponent("aliceId")
    )!!
    bobDriver = DefaultDriverFactory.get().getDriver(
      backingKey.childKeyWithComponent("bobId")
    )!!

    aliceDriver.send(CrdtEntity.Data(VersionMap("alice" to 1), alice, referenceBuilder), 1)
    bobDriver.send(CrdtEntity.Data(VersionMap("bob" to 1), bob, referenceBuilder), 1)
    Unit
  }

  @Test
  fun dereference_canDereference_friend() = runBlockingTest {
    val dereferencedBob = (alice.singletons["sibling"] as Reference)
      .dereference()
    assertThat(dereferencedBob!!.id).isEqualTo(bob.id)
    assertThat(dereferencedBob.singletons["name"]!!.unwrap())
      .isEqualTo(bob.singletons["name"]!!.unwrap())
    assertThat(dereferencedBob.singletons["sibling"]!!.unwrap())
      .isEqualTo(bob.singletons["sibling"]!!.unwrap())
  }

  @Test
  fun dereference_canDereference_sibling_of_sibling_of_sibling() = runBlockingTest {
    val dereferencedBob =
      (alice.singletons["sibling"] as Reference).dereference()!!
    val dereferencedAliceFromBob =
      (dereferencedBob.singletons["sibling"] as Reference)
        .also { it.dereferencer = dereferencer }
        .dereference()!!
    val dereferencedBobFromAliceFromBob =
      (dereferencedAliceFromBob.singletons["sibling"] as Reference)
        .also { it.dereferencer = dereferencer }
        .dereference()!!

    assertThat(dereferencedAliceFromBob.id).isEqualTo(alice.id)
    assertThat(dereferencedAliceFromBob.singletons["name"]!!.unwrap())
      .isEqualTo(alice.singletons["name"]!!.unwrap())
    assertThat(dereferencedAliceFromBob.singletons["sibling"]!!.unwrap())
      .isEqualTo(alice.singletons["sibling"]!!.unwrap())

    assertThat(dereferencedBobFromAliceFromBob.id).isEqualTo(bob.id)
    assertThat(dereferencedBobFromAliceFromBob.singletons["name"]!!.unwrap())
      .isEqualTo(bob.singletons["name"]!!.unwrap())
    assertThat(dereferencedBobFromAliceFromBob.singletons["sibling"]!!.unwrap())
      .isEqualTo(bob.singletons["sibling"]!!.unwrap())
  }

  @Test
  fun rawEntity_matches_schema_isTrue_whenEntityIsEmpty_andSchemaIsEmpty() {
    val entity = RawEntity(singletons = emptyMap(), collections = emptyMap())
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = emptyMap(),
        collections = emptyMap()
      ),
      "abc"
    )

    assertThat(entity matches schema).isTrue()
  }

  @Test
  fun rawEntity_matches_schema_isFalse_whenEntityIsEmpty_butSchemaIsNot() {
    val entity = RawEntity(singletons = emptyMap(), collections = emptyMap())
    val schemaOne = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf("name" to FieldType.Text),
        collections = emptyMap()
      ),
      "abc"
    )
    val schemaTwo = Schema(
      emptySet(),
      SchemaFields(
        singletons = emptyMap(),
        collections = mapOf("friends" to FieldType.EntityRef("def"))
      ),
      "abc"
    )

    assertThat(entity matches schemaOne).isFalse()
    assertThat(entity matches schemaTwo).isFalse()
  }

  @Test
  fun rawEntity_matches_schema_isTrue_ifSingletonIsFound_inSchema() {
    val entity = RawEntity(
      singletons = mapOf("name" to "Sundar".toReferencable()),
      collections = emptyMap()
    )
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf(
          "name" to FieldType.Text,
          "age" to FieldType.Number
        ),
        collections = emptyMap()
      ),
      "abc"
    )

    assertThat(entity matches schema).isTrue()
  }

  @Test
  fun rawEntity_matches_schema_isFalse_ifNoSingletonsFound_inSchema() {
    val entity = RawEntity(
      singletons = mapOf("foo" to "bar".toReferencable()),
      collections = emptyMap()
    )
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf(
          "name" to FieldType.Text,
          "age" to FieldType.Number
        ),
        collections = emptyMap()
      ),
      "abc"
    )

    assertThat(entity matches schema).isFalse()
  }

  @Test
  fun rawEntity_matches_schema_isTrue_ifCollectionIsFound_inSchema() {
    val entity = RawEntity(
      singletons = emptyMap(),
      collections = mapOf(
        "friends" to setOf(
          Reference("Susan", RamDiskStorageKey("susan"), null)
        )
      )
    )
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = emptyMap(),
        collections = mapOf("friends" to FieldType.EntityRef("def"))
      ),
      "abc"
    )

    assertThat(entity matches schema).isTrue()
  }

  @Test
  fun rawEntity_matches_schema_isTrue_ifNoCollectionsAreFound_inSchema() {
    val entity = RawEntity(
      singletons = emptyMap(),
      collections = mapOf(
        "not_friends" to setOf(
          Reference("Susan", RamDiskStorageKey("susan"), null)
        )
      )
    )
    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = emptyMap(),
        collections = mapOf("friends" to FieldType.EntityRef("def"))
      ),
      "abc"
    )

    assertThat(entity matches schema).isFalse()
  }
}
