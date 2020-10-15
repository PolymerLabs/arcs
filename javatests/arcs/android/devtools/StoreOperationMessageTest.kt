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

import arcs.android.devtools.DevToolsMessage.Companion.ACTOR
import arcs.android.devtools.DevToolsMessage.Companion.KIND
import arcs.android.devtools.DevToolsMessage.Companion.MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.OPERATIONS
import arcs.android.devtools.DevToolsMessage.Companion.STORAGE_KEY
import arcs.android.devtools.DevToolsMessage.Companion.STORE_ID
import arcs.android.devtools.DevToolsMessage.Companion.STORE_OP_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.STORE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.TYPE
import arcs.android.devtools.DevToolsMessage.Companion.UPDATE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.VALUE
import arcs.android.devtools.DevToolsMessage.Companion.VERSION_MAP
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.ProxyMessage
import arcs.core.util.JsonValue
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class StoreOperationMessageTest {

  @Test
  fun toJson() {
    val expected = JsonValue.JsonObject(
      KIND to JsonValue.JsonString(STORE_OP_MESSAGE),
      MESSAGE to JsonValue.JsonObject(
        STORE_ID to JsonValue.JsonNumber(1.toDouble()),
        STORE_TYPE to JsonValue.JsonString("Direct"),
        STORAGE_KEY to JsonValue.JsonString("db://sk"),
        OPERATIONS to JsonValue.JsonArray(
          listOf(
            JsonValue.JsonObject(
              TYPE to JsonValue.JsonString(UPDATE_TYPE),
              VALUE to JsonValue.JsonString("foo"),
              ACTOR to JsonValue.JsonString("bar"),
              VERSION_MAP to JsonValue.JsonObject(
                "fooBar" to JsonValue.JsonNumber(1.toDouble())
              )
            )
          )
        )
      )
    )
    val proxyMessage = ProxyMessage.Operations<CrdtData, CrdtOperation, Any?>(
      listOf(
        CrdtSingleton.Operation.Update(
          value = ReferencablePrimitive(String::class, "foo"),
          actor = "bar",
          versionMap = VersionMap(mapOf("fooBar" to 1))
        )
      ),
      id = 1
    )
    val message = StoreOperationMessage(proxyMessage, "Direct", "db://sk").toJson()
    assertThat(message).isEqualTo(expected.toString())
  }
}
