package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.ACTOR
import arcs.android.devtools.DevToolsMessage.Companion.CLOCK
import arcs.android.devtools.DevToolsMessage.Companion.KIND
import arcs.android.devtools.DevToolsMessage.Companion.MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.MODEL_UPDATE_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.OPERATIONS
import arcs.android.devtools.DevToolsMessage.Companion.STORAGE_KEY
import arcs.android.devtools.DevToolsMessage.Companion.STORE_ID
import arcs.android.devtools.DevToolsMessage.Companion.STORE_OP_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.STORE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.TYPE
import arcs.android.devtools.DevToolsMessage.Companion.UPDATE_TYPE
import arcs.android.devtools.DevToolsMessage.Companion.VALUE
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.ProxyMessage
import arcs.core.util.JsonValue
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DevToolsMessageTests {

  @Test
  fun storeOperationMessageTest() = runBlockingTest {
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
              CLOCK to JsonValue.JsonObject(
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
          clock = VersionMap(mapOf("fooBar" to 1))
        )
      ),
      id = 1
    )
    val message = StoreOperationMessage(proxyMessage, "Direct", "db://sk").toJson()
    assertThat(message).isEqualTo(expected.toString())
  }

  @Test
  fun ModelUpdateMessageTest() = runBlockingTest {
    val expected = JsonValue.JsonObject(
      KIND to JsonValue.JsonString(MODEL_UPDATE_MESSAGE),
      MESSAGE to JsonValue.JsonObject(
        "model" to JsonValue.JsonObject(
          DevToolsMessage.VERSIONMAP to JsonValue.JsonObject(
            "Bar" to JsonValue.JsonNumber(2.toDouble())
          ),
          "singletons" to JsonValue.JsonObject(
            "a" to JsonValue.JsonObject(
              DevToolsMessage.VERSIONMAP to JsonValue.JsonObject(
                "alice" to JsonValue.JsonNumber(1.toDouble())
              ),
              "values" to JsonValue.JsonObject(
                "AAA".toReferencable().id to JsonValue.JsonString("AAA")
              )
            ),
            "b" to JsonValue.JsonObject(
              DevToolsMessage.VERSIONMAP to JsonValue.JsonObject(
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
