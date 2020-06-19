package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


/** Tests for [Json]. */
@RunWith(JUnit4::class)
class JsonTest {

    @Test
    fun testParse() {
        val obj = Json.parse("{\"xxxx\":1,\"foo\":false}") as ParseResult.Success<JsonValue<*>>
        val obj2 = Json.parse("[1,2,]") as ParseResult.Success<JsonValue<*>>
        assertThat(obj.value.toString()).isEqualTo("{\"x\":1.0}")
        assertThat(obj.value.toString()).isEqualTo("[\"x\",2.0]")
    }
}
