package arcs.android.accelerator

import com.beust.klaxon.Debug
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.lang.reflect.Modifier
import kotlin.reflect.full.declaredMemberProperties
import kotlin.reflect.jvm.javaField

/** Tests for [AcceleratorPipesShell]. */
@RunWith(JUnit4::class)
class ParserTests {
  lateinit var shell: AcceleratorPipesShell

  @Before
  fun setup() {
    shell = AcceleratorPipesShell()
    val clazz = Debug::class.java
    val field = clazz.getDeclaredField("verbose")
    field.isAccessible = true

    val modifers = field.javaClass.getDeclaredField("modifiers")
    modifers.isAccessible = true
    modifers.setInt(field, field.modifiers and Modifier.FINAL.inv())
    field.setBoolean(null, true)
  }


  @Test
  fun parseStartArc() {
    val arcId = "arc-1"
    val pecId = "pec-1"
    val recipe = "foo"
    val result = shell.parseMessage("""
        {
        "message": "runArc",
        "arcId": "$arcId",
        "pecId": "$pecId",
        "recipe":"$recipe"
        }
        """.trimIndent()) as RunArcMessage
    assertThat(result.arcId).isEqualTo(arcId)
    assertThat(result.pecId).isEqualTo(pecId)
    assertThat(result.recipe).isEqualTo(recipe)
  }

  @Test
  fun parseStopArc() {
    val arcId = "arc-1"
    val pecId = "pec-1"
    val result = shell.parseMessage("""
        {
        "message": "stopArc",
        "arcId": "$arcId",
        "pecId": "$pecId",
        }
        """.trimIndent()) as StopArcMessage
    assertThat(result.arcId).isEqualTo(arcId)
    assertThat(result.pecId).isEqualTo(pecId)
  }

  @Test
  fun testInitializeProxy() {
    val particle = "particle-1"
    val pecId = "pec-1"

    val result = shell.parseMessage("""
        {
          "message": "pec",
          "id": "$pecId",
          "entity": {
            "messageType": "InitializeProxy",
            "messageBody": {
              "handle": "h",
              "callback": "c",
            }
          }
        }""".trimIndent()) as PecMessagePayload
    assertThat(result.pecId).isEqualTo(pecId)
    val msg = result.pecMessage!!
    assertThat(msg.messageType).isEqualTo("InitializeProxy")
    val body = msg.messageBody!! as InitializeProxyMessage
    assertThat(body.callback).isEqualTo("c")
    assertThat(body.proxyHandleId).isEqualTo("h")
  }

  @Test
  fun testSynchronizeProxy() {
    val particle = "particle-1"
    val pecId = "pec-1"

    val result = shell.parseMessage("""
        {
          "message": "pec",
          "id": "$pecId",
          "entity": {
            "messageType": "SynchronizeProxy",
            "messageBody": {
              "handle": "h",
              "callback": "c",
            }
          }
        }""".trimIndent()) as PecMessagePayload
    assertThat(result.pecId).isEqualTo(pecId)
    val msg = result.pecMessage!!
    assertThat(msg.messageType).isEqualTo("SynchronizeProxy")
    val body = msg.messageBody!! as SynchronizeProxyMessage
    assertThat(body.callback).isEqualTo("c")
    assertThat(body.proxyHandleId).isEqualTo("h")
  }

  @Test
  fun testOutput() {
    val particle = "particle-1"
    val pecId = "pec-1"

    val result = shell.parseMessage("""
        {
          "message": "pec",
          "id": "$pecId",
          "entity": {
            "messageType": "Output",
            "messageBody": {
              "handle": "h",
              "callback": "c",
              "particle": "$particle",
              "content": {
                "template": "t",
                "model": "m"
              }
            }
          }
        }""".trimIndent()) as PecMessagePayload
    assertThat(result.pecId).isEqualTo(pecId)
    val msg = result.pecMessage!!
    assertThat(msg.messageType).isEqualTo("Output")
    val body = msg.messageBody!! as HandleOutputMessage
    assertThat(body.callback).isEqualTo("c")
    assertThat(body.proxyHandleId).isEqualTo("h")
    assertThat(body.particle).isEqualTo(particle)
    assertThat(body.content!!.template).isEqualTo("t")
    assertThat(body.content!!.model).isEqualTo("m")
  }
}