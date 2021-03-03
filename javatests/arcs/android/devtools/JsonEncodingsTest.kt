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

package arcs.android.devtools

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.toReferencable
import arcs.core.storage.RawReference
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.util.JsonValue.JsonArray
import arcs.core.util.JsonValue.JsonBoolean
import arcs.core.util.JsonValue.JsonNumber
import arcs.core.util.JsonValue.JsonObject
import arcs.core.util.JsonValue.JsonString
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class JsonEncodingsTest {

  @Test
  fun versionMap_toJson() {
    assertThat(
      VersionMap(
        mapOf(
          "foo" to 1,
          "bar" to 42
        )
      ).toJson()
    ).isEqualTo(
      JsonObject(
        "foo" to JsonNumber(1.toDouble()),
        "bar" to JsonNumber(42.toDouble())
      )
    )
  }

  @Test
  fun referencable_primitives_toJson() {
    assertThat("foo".toReferencable().toJson()).isEqualTo(JsonString("foo"))
    assertThat(true.toReferencable().toJson()).isEqualTo(JsonBoolean(true))
    assertThat(3.25.toReferencable().toJson()).isEqualTo(JsonNumber(3.25))
    assertThat(3.25.toFloat().toReferencable().toJson()).isEqualTo(JsonNumber(3.25))
    assertThat(10.toByte().toReferencable().toJson()).isEqualTo(JsonNumber(10.0))
    assertThat(10.toReferencable().toJson()).isEqualTo(JsonNumber(10.0))
    assertThat(10L.toReferencable().toJson()).isEqualTo(JsonNumber(10.0))
  }

  @Test
  fun referencable_reference_toJson() {
    assertThat(
      RawReference(
        id = "a:b:c",
        storageKey = DummyStorageKey("foo"),
        version = VersionMap(mapOf("foo" to 1)),
        _creationTimestamp = 100,
        _expirationTimestamp = 200,
        isHardReference = false
      ).toJson()
    ).isEqualTo(
      JsonObject(
        "id" to JsonString("a:b:c"),
        "storageKey" to JsonString("dummy://foo"),
        "version" to JsonObject("foo" to JsonNumber(1.toDouble())),
        "creationTimestamp" to JsonNumber(100.toDouble()),
        "expirationTimestamp" to JsonNumber(200.toDouble()),
        "isHardReference" to JsonBoolean(false)
      )
    )
  }

  @Test
  fun referencable_referencableList_toJson() {
    assertThat(
      ReferencableList(
        listOf("foo".toReferencable(), "bar".toReferencable(), "baz".toReferencable()),
        FieldType.Text
      ).toJson()
    ).isEqualTo(
      JsonArray(
        listOf(
          JsonString("foo"),
          JsonString("bar"),
          JsonString("baz")
        )
      )
    )
  }

  @Test
  fun referencable_referencableImpl_toJson() {
    assertThat(
      CrdtEntity.ReferenceImpl("Foo".toReferencable().id).toJson()
    ).isEqualTo(
      JsonString("Foo")
    )
  }

  @Test
  fun referencable_rawEntity_toJson() {
    assertThat(
      RawEntity(
        id = "a:b:c",
        singletons = mapOf(
          "names" to ReferencableList(
            listOf("Brian".toReferencable(), "John".toReferencable()),
            FieldType.Text
          ),
          "nickname" to "Ollie".toReferencable(),
          "pet" to RawReference(
            id = "ollie:buddy",
            storageKey = DummyStorageKey("foo"),
            version = VersionMap(mapOf("foo" to 1)),
            _creationTimestamp = 100,
            _expirationTimestamp = 200,
            isHardReference = false
          )
        ),
        collections = mapOf(
          "favBands" to setOf("Beatles".toReferencable(), "Stones".toReferencable())
        ),
        creationTimestamp = 100,
        expirationTimestamp = 200
      ).toJson()
    ).isEqualTo(
      JsonObject(
        "id" to JsonString("a:b:c"),
        "singletons" to JsonObject(
          "names" to JsonArray(listOf(JsonString("Brian"), JsonString("John"))),
          "nickname" to JsonString("Ollie"),
          "pet" to JsonObject(
            "id" to JsonString("ollie:buddy"),
            "storageKey" to JsonString("dummy://foo"),
            "version" to JsonObject("foo" to JsonNumber(1.toDouble())),
            "creationTimestamp" to JsonNumber(100.toDouble()),
            "expirationTimestamp" to JsonNumber(200.toDouble()),
            "isHardReference" to JsonBoolean(false)
          )
        ),
        "collections" to JsonObject(
          "favBands" to JsonArray(
            listOf(
              JsonString("Beatles"),
              JsonString("Stones")
            )
          )
        ),
        "creationTimestamp" to JsonNumber(100.toDouble()),
        "expirationTimestamp" to JsonNumber(200.toDouble())
      )
    )
  }
}
