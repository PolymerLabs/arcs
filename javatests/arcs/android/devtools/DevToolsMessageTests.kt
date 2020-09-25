package arcs.android.devtools

import arcs.android.devtools.DevToolsMessage.Companion.ACTOR
import arcs.android.devtools.DevToolsMessage.Companion.CLOCK
import arcs.android.devtools.DevToolsMessage.Companion.KIND
import arcs.android.devtools.DevToolsMessage.Companion.MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.MODEL_UPDATE_MESSAGE
import arcs.android.devtools.DevToolsMessage.Companion.OPERATIONS
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
    val message = StoreOperationMessage(proxyMessage, "Direct").toJson()
    assertThat(message).isEqualTo(expected.toString())
  }

  @Test
  fun ModelUpdateMessageTest() = runBlockingTest {
    val referenceA: CrdtEntity.Reference = CrdtEntity.ReferenceImpl("AAA")
    val referenceB: CrdtEntity.Reference = CrdtEntity.ReferenceImpl("BBB")
    val expected = JsonValue.JsonObject(
      KIND to JsonValue.JsonString(MODEL_UPDATE_MESSAGE),
      MESSAGE to JsonValue.JsonObject(
        "model" to JsonValue.JsonObject(
          DevToolsMessage.VERSIONMAP to JsonValue.JsonObject(
            "Bar" to JsonValue.JsonNumber(2.toDouble())
          ),
          "singletons" to JsonValue.JsonArray(
            listOf(
              JsonValue.JsonObject(
                "a" to JsonValue.JsonObject(
                  DevToolsMessage.VERSIONMAP to JsonValue.JsonObject(
                    "alice" to JsonValue.JsonNumber(1.toDouble())
                  ),
                  "values" to JsonValue.JsonObject(
                    "AAA" to JsonValue.JsonString("Reference(AAA)")
                  )
                )
              ),
              JsonValue.JsonObject(
                "b" to JsonValue.JsonObject(
                  DevToolsMessage.VERSIONMAP to JsonValue.JsonObject(
                    "bob" to JsonValue.JsonNumber(1.toDouble())
                  ),
                  "values" to JsonValue.JsonObject(
                    "BBB" to JsonValue.JsonString("Reference(BBB)")
                  )
                )
              )
            )
          ),
          "collections" to JsonValue.JsonArray()
        ),
        STORE_TYPE to JsonValue.JsonString("Direct")
      )
    )

    val proxyMessage = ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, Any?>(
      model = CrdtEntity.Data(
        singletons = mapOf(
          "a" to CrdtSingleton(VersionMap("alice" to 1), referenceA),
          "b" to CrdtSingleton(VersionMap("bob" to 1), referenceB)
        ),
        collections = mutableMapOf(),
        versionMap = VersionMap("Bar" to 2),
        creationTimestamp = 971,
        expirationTimestamp = -1
      ),
      id = 1
    )
    val message = ModelUpdateMessage(proxyMessage, "Direct").toJson()
    assertThat(message).isEqualTo(expected.toString())
  }
}
