package arcs.core.util

import arcs.core.util.JsonValue.JsonArray
import arcs.core.util.JsonValue.JsonBoolean
import arcs.core.util.JsonValue.JsonNull
import arcs.core.util.JsonValue.JsonNumber
import arcs.core.util.JsonValue.JsonObject
import arcs.core.util.JsonValue.JsonString
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


/** Tests for [Json]. */
@RunWith(JUnit4::class)
class JsonTest {

    @Test
    fun testParse() {
        assertThat(Json.parse("null")).isEqualTo(JsonNull)
        assertThat(Json.parse("42.0").number()).isEqualTo(42.0)
        assertThat(Json.parse("1e3").number()).isEqualTo(1000.0)
        assertThat(Json.parse("-1.2e-2").number()).isEqualTo(-0.012)
        assertThat(Json.parse("-42.0").number()).isEqualTo(-42.0)
        assertThat(Json.parse("\"hello\\\"world\"").string()).isEqualTo("hello\"world")
        assertThat(Json.parse("true").bool()).isTrue()
        assertThat(Json.parse("false").bool()).isFalse()
        assertThat(Json.parse("[]").array()?.value).isEmpty()
        assertThat(Json.parse("{}").obj()?.value).isEmpty()
        assertThat(Json.parse("[1]").array()?.value).containsExactly(JsonNumber(1.0))
        assertThat(Json.parse("[1,\"foo\",true]").array()?.value).containsExactly(
            JsonNumber(1.0),
            JsonString("foo"),
            JsonBoolean(true)
        )
        assertThat(Json.parse("{\"x\":42.0}").obj()?.value).containsExactlyEntriesIn(
            mapOf("x" to JsonNumber(42.0))
        )
        assertThat(Json.parse(
            "{\"x\":42.0,\"y\":\"hello\",\"z\":true,\"a\":[1],\"b\":{\"x\":42.0}}"
        ).obj()?.value).containsExactlyEntriesIn(
            mapOf(
                "x" to JsonNumber(42.0),
                "y" to JsonString("hello"),
                "z" to JsonBoolean(true),
                "a" to JsonArray(listOf(JsonNumber(1.0))),
                "b" to JsonObject(mapOf("x" to JsonNumber(42.0)))
            )
        )
    }
}
