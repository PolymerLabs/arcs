package arcs.core.data

import arcs.core.data.util.toReferencable
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class RawEntityTest {
  @Test
  fun toString_empty() {
    assertThat(RawEntity().toString()).isEqualTo(
      "RawEntity(id=NO REFERENCE ID, creationTimestamp=-1, expirationTimestamp=-1, " +
        "singletons={}, collections={})"
    )
  }

  @Test
  fun toString_withValues() {
    assertThat(
      RawEntity(id = "abc", creationTimestamp = 111, expirationTimestamp = 222).toString()
    ).isEqualTo(
      "RawEntity(id=abc, creationTimestamp=111, expirationTimestamp=222, " +
        "singletons={}, collections={})"
    )
  }

  @Test
  fun toString_singletonKeysSorted() {
    assertThat(
      RawEntity(
        singletons = mapOf(
          "b" to 1.toReferencable(),
          "a" to 2.toReferencable(),
          "c" to 3.toReferencable()
        )
      ).toString()
    ).isEqualTo(
      "RawEntity(id=NO REFERENCE ID, creationTimestamp=-1, expirationTimestamp=-1, " +
        "singletons={a=Primitive(2), b=Primitive(1), c=Primitive(3)}, collections={})"
    )
  }

  @Test
  fun toString_collectionKeysSorted() {
    assertThat(
      RawEntity(
        collections = mapOf("b" to emptySet(), "a" to emptySet(), "c" to emptySet())
      ).toString()
    ).isEqualTo(
      "RawEntity(id=NO REFERENCE ID, creationTimestamp=-1, expirationTimestamp=-1, " +
        "singletons={}, collections={a=[], b=[], c=[]})"
    )
  }

  @Test
  fun toString_collectionValuesSorted() {
    assertThat(
      RawEntity(
        collections = mapOf(
          "x" to setOf("b".toReferencable(), "a".toReferencable(), "c".toReferencable())
        )
      ).toString()
    ).isEqualTo(
      "RawEntity(id=NO REFERENCE ID, creationTimestamp=-1, expirationTimestamp=-1, " +
        "singletons={}, collections={x=[Primitive(a), Primitive(b), Primitive(c)]})"
    )
  }
}
