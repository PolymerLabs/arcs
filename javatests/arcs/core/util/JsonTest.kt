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
        assertThat(Json.parse("1e+3").number()).isEqualTo(1000.0)
        assertThat(Json.parse("+1e+3").number()).isEqualTo(1000.0)
        assertThat(Json.parse("-1.2e-2").number()).isEqualTo(-0.012)
        assertThat(Json.parse("-42.0").number()).isEqualTo(-42.0)
        assertThat(Json.parse("\"hello\\\"world\"").string()).isEqualTo("hello\"world")
        assertThat(Json.parse("\"hello\\nworld\"").string()).isEqualTo("hello\nworld")
        assertThat(Json.parse("\"hello\\u0041world\"").string()).isEqualTo("helloAworld")
        assertThat(Json.parse("true").bool()).isTrue()
        assertThat(Json.parse("false").bool()).isFalse()
        assertThat(Json.parse("[]").array()?.value).isEmpty()
        assertThat(Json.parse("[ ]").array()?.value).isEmpty()
        assertThat(Json.parse("{}").obj()?.value).isEmpty()
        assertThat(Json.parse("{ }").obj()?.value).isEmpty()
        assertThat(Json.parse("[1]").array()?.value).containsExactly(JsonNumber(1.0))
        assertThat(Json.parse("[ 1 ]").array()?.value).containsExactly(JsonNumber(1.0))
        assertThat(Json.parse("[1 , \"foo\",  true]").array()?.value).containsExactly(
            JsonNumber(1.0),
            JsonString("foo"),
            JsonBoolean(true)
        )
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

    @Test
    fun testStringify() {
        assertThat(JsonNull.toString()).isEqualTo("null")
        assertThat(JsonNumber(42.0).toString()).isEqualTo("42.0")
        assertThat(JsonNumber(1000.0).toString()).isEqualTo("1000.0")
        assertThat(JsonNumber(+1e+3).toString()).isEqualTo("1000.0")
        assertThat(JsonString("hello\"world").toString()).isEqualTo("\"hello\\\"world\"")
        assertThat(JsonString("hello\nworld").toString()).isEqualTo("\"hello\\nworld\"")
        assertThat(JsonString("hello\uD83C\uDF08world").toString()).isEqualTo(
            "\"hello\\ud83c\\udf08world\""
        )
        assertThat(JsonBoolean(true).toString()).isEqualTo("true")
        assertThat(JsonBoolean(false).toString()).isEqualTo("false")
        assertThat(JsonArray(listOf<JsonBoolean>()).toString()).isEqualTo("[]")
        assertThat(JsonObject().toString()).isEqualTo("{}")
        assertThat(JsonArray(listOf<JsonNumber>(
            JsonNumber(1.0)
        )).toString()).isEqualTo("[1.0]")
        assertThat(JsonArray(listOf<JsonValue<*>>(
            JsonNumber(971.0),
            JsonString("foo"),
            JsonBoolean(true)
        )).toString()).isEqualTo("[971.0,\"foo\",true]")
        assertThat(JsonObject(mapOf(
            "x" to JsonNumber(42.0)
        )).toString()).isEqualTo("{\"x\":42.0}")
        assertThat(JsonObject(mapOf(
            "x" to JsonNumber(42.0),
            "y" to JsonString("hello"),
            "z" to JsonBoolean(true),
            "a" to JsonArray(listOf(JsonNumber(1.0))),
            "b" to JsonObject(mapOf("x" to JsonNumber(42.0)))
        )).toString()).isEqualTo(
            "{\"x\":42.0,\"y\":\"hello\",\"z\":true,\"a\":[1.0],\"b\":{\"x\":42.0}}"
        )
    }
}
