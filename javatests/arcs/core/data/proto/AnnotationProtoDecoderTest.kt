package arcs.core.data.proto

import arcs.core.data.Annotation
import arcs.core.data.AnnotationParam
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class AnnotationProtoDecoderTest {
    @Test
    fun roundTrip() {
        val annotation = Annotation(
            name = "MyAnnotation",
            params = mapOf(
                "str" to AnnotationParam.Str("abc"),
                "bool" to AnnotationParam.Bool(true),
                "num" to AnnotationParam.Num(123)
            )
        )
        assertThat(annotation.encode().decode()).isEqualTo(annotation)
    }
}
