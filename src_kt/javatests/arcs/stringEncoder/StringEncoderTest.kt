package arcs.stringEncoder

import arcs.StringEncoder
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [StringEncoder]. */
@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@RunWith(JUnit4::class)
class StringEncoderTest {

    @Test
    fun encodeText() {
        val txt = "Kangaroo"
        val encodedString = StringEncoder.encodeValue(txt)
        val expectedString = "T8:Kangaroo"
        assertThat(encodedString).isEqualTo(expectedString)
    }

    @Test
    fun encodeDictionary() {
        val Dict = mapOf("name" to "Jill", "age" to "70.0")
        val encodedString = StringEncoder.encodeDictionary(Dict)
        val expectedString = "2:4:nameT4:Jill3:ageT4:70.0"
        assertThat(encodedString).isEqualTo(expectedString)
    }

    @Test
    fun encodeList() {
        val list = listOf(
            mapOf("name" to "Jill", "age" to "70.0"),
            mapOf("name" to "Jack", "age" to "25.0"),
            mapOf("name" to "Jen", "age" to "50.0")
        )
        val encodedString = StringEncoder.encodeList(list)
        /* ktlint-disable max-line-length */
        val expectedString =
            "3:D27:2:4:nameT4:Jill3:ageT4:70.0D27:2:4:nameT4:Jack3:ageT4:25.0D26:2:4:nameT3:Jen3:ageT4:50.0"
        /* ktlint-enable max-line-length */
        assertThat(encodedString).isEqualTo(expectedString)
    }

    @Test
    fun encodeEntity() {
        val list = listOf(
            mapOf("name" to "Jill", "age" to "70.0"),
            mapOf("name" to "Jack", "age" to "25.0"),
            mapOf("name" to "Jen", "age" to "50.0")
        )
        val encodedString = StringEncoder.encodeValue(list)
        /* ktlint-disable max-line-length */
        val expectedString =
            "A94:3:D27:2:4:nameT4:Jill3:ageT4:70.0D27:2:4:nameT4:Jack3:ageT4:25.0D26:2:4:nameT3:Jen3:ageT4:50.0"
        /* ktlint-enable max-line-length */
        assertThat(encodedString).isEqualTo(expectedString)
    }
}
