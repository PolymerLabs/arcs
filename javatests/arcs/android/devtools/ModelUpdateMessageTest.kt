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

import arcs.android.devtools.DevToolsMessage.Companion.KIND
import arcs.android.devtools.DevToolsMessage.Companion.MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.MODEL_UPDATE_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.STORAGE_KEY
import arcs.android.devtools.DevToolsMessage.Companion.STORE_TYPE
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.util.toReferencable
import arcs.core.storage.ProxyMessage
import arcs.core.util.JsonValue
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ModelUpdateMessageTest {

  @Test
  fun toJson() {
    val expected = JsonValue.JsonObject(
      KIND to JsonValue.JsonString(MODEL_UPDATE_MESSAGE),
      MESSAGE to JsonValue.JsonObject(
        "model" to JsonValue.JsonObject(
          DevToolsMessage.VERSION_MAP to JsonValue.JsonObject(
            "Bar" to JsonValue.JsonNumber(2.toDouble())
          ),
          "singletons" to JsonValue.JsonObject(
            "a" to JsonValue.JsonObject(
              DevToolsMessage.VERSION_MAP to JsonValue.JsonObject(
                "alice" to JsonValue.JsonNumber(1.toDouble())
              ),
              "values" to JsonValue.JsonObject(
                "AAA".toReferencable().id to JsonValue.JsonString("AAA")
              )
            ),
            "b" to JsonValue.JsonObject(
              DevToolsMessage.VERSION_MAP to JsonValue.JsonObject(
                "bob" to JsonValue.JsonNumber(1.toDouble())
              ),
              "values" to JsonValue.JsonObject(
                "BBB".toReferencable().id to JsonValue.JsonString("BBB")
              )
            )
          ),
          "collections" to JsonValue.JsonObject()
        ),
        STORE_TYPE to JsonValue.JsonString("Direct"),
        STORAGE_KEY to JsonValue.JsonString("db://sk")
      )
    )

    val proxyMessage = ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, Any?>(
      model = CrdtEntity.Data(
        singletons = mapOf(
          "a" to CrdtSingleton<CrdtEntity.Reference>(
            VersionMap("alice" to 1),
            CrdtEntity.ReferenceImpl("AAA".toReferencable().id)
          ),
          "b" to CrdtSingleton<CrdtEntity.Reference>(
            VersionMap("bob" to 1),
            CrdtEntity.ReferenceImpl("BBB".toReferencable().id)
          )
        ),
        collections = mapOf(),
        versionMap = VersionMap("Bar" to 2),
        creationTimestamp = 971,
        expirationTimestamp = -1
      ),
      id = 1
    )
    val message = ModelUpdateMessage(proxyMessage, "Direct", "db://sk").toJson()
    assertThat(message).isEqualTo(expected.toString())
  }
}
