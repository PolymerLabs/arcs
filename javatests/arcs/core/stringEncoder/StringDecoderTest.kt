package arcs.stringEncoder

import arcs.StringDecoder
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [StringDecoder]. */
@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@RunWith(JUnit4::class)
class StringDecoderTest {

    @Test
    fun encodeDictionary() {
        val Dict = mapOf("name" to "Jill", "age" to "70.0")
        val encdoedDict = "2:4:name4:Jill3:age4:70.0"
        val decodedDict = StringDecoder.decodeDictionary(encdoedDict)
        assertThat(decodedDict).isEqualTo(Dict)
    }
}
