package arcs.core.stringEncoder

import arcs.StringEncoder
import arcs.utf8ToString

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [StringEncoder]. */
@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@RunWith(JUnit4::class)
class StringEncoderTest {
    @Test
    fun encodeTrueBoolean() {
        val se = StringEncoder()
        se.encodeValue(true)
        val encodedString = se.toByteArray().utf8ToString()
        assertThat(encodedString).isEqualTo("B1")
    }

    @Test
    fun encodeFalseBoolean() {
        val se = StringEncoder()
        se.encodeValue(false)
        val encodedString = se.toByteArray().utf8ToString()
        assertThat(encodedString).isEqualTo("B0")
    }

    @Test
    fun encodeNumber() {
        val se = StringEncoder()
        se.encodeValue(127.89)
        val encodedString = se.toByteArray().utf8ToString()
        assertThat(encodedString).isEqualTo("N127.89:")
    }

    @Test
    fun encodeText() {
        val se = StringEncoder()
        se.encodeValue("Kangaroo")
        val encodedString = se.toByteArray().utf8ToString()
        assertThat(encodedString).isEqualTo("T8:Kangaroo")
    }

    @Test
    fun encodeDictionary() {
        val se = StringEncoder()
        val dict = mapOf("name" to "Jill", "age" to 70.0)
        se.encodeDictionary(dict)
        val encodedString = se.toByteArray().utf8ToString()
        assertThat(encodedString).isEqualTo("2:4:nameT4:Jill3:ageN70.0:")
    }

    @Test
    fun encodeList() {
        val se = StringEncoder()
        val list = listOf(
            mapOf("name" to "Jill", "age" to 70.0),
            mapOf("name" to "Jack", "age" to 2.0),
            mapOf("name" to "Jen", "age" to 150.0)
        )
        se.encodeList(list)
        val encodedString = se.toByteArray().utf8ToString()
        /* ktlint-disable max-line-length */
        assertThat(encodedString).isEqualTo(
            "3:D26:2:4:nameT4:Jill3:ageN70.0:D25:2:4:nameT4:Jack3:ageN2.0:D26:2:4:nameT3:Jen3:ageN150.0:"
        )
        /* ktlint-enable max-line-length */
    }

    @Test
    fun encodeListAsValue() {
        val se = StringEncoder()
        val list = listOf(
            mapOf("name" to "Jill", "age" to "70.0"),
            mapOf("name" to "Jack", "age" to "25.0"),
            mapOf("name" to "Jen", "age" to "50.0")
        )
        se.encodeValue(list)
        val encodedString = se.toByteArray().utf8ToString()
        /* ktlint-disable max-line-length */
        assertThat(encodedString).isEqualTo(
            "A94:3:D27:2:4:nameT4:Jill3:ageT4:70.0D27:2:4:nameT4:Jack3:ageT4:25.0D26:2:4:nameT3:Jen3:ageT4:50.0"
        )
        /* ktlint-enable max-line-length */
    }
}
