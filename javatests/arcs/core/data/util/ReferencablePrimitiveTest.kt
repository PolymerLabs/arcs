/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data.util

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.data.util.ReferencablePrimitive.Companion.DOUBLE_TOLERANCE
import arcs.core.data.util.ReferencablePrimitive.Companion.FLOAT_TOLERANCE
import arcs.core.data.util.ReferencablePrimitive.Companion.isSupportedPrimitive
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import com.google.common.truth.Truth.assertThat
import java.math.BigInteger
import java.time.Instant
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
class ReferencablePrimitiveTest(private val params: UnwrapWrapParams) {

  @Test
  fun valueRepr_arcsInstant_isEpochMillisString() {
    val instant = ArcsInstant.ofEpochMilli(DUMMY_MILLIS)

    assertThat(ReferencablePrimitive(ArcsInstant::class, instant).valueRepr)
      .isEqualTo(DUMMY_MILLIS.toString())
  }

  @Test
  fun valueRepr_byteArray_isBase64Encoded() {
    val byteArray = "Toro y Moi".toByteArray()

    assertThat(ReferencablePrimitive(ByteArray::class, byteArray).valueRepr)
      .isEqualTo("VG9ybyB5IE1vaQ==")
  }

  @Test
  fun valueRepr_defaultsTo_toString() {
    assertThat(ReferencablePrimitive(Double::class, 12.0).valueRepr).isEqualTo(12.0.toString())
    assertThat(ReferencablePrimitive(Byte::class, 8).valueRepr).isEqualTo(8.toString())
    assertThat(ReferencablePrimitive(Boolean::class, true).valueRepr).isEqualTo(true.toString())
  }

  @Test
  fun unwrap_unwrapsIt() {
    assertThat(params.primitiveStringKt).isNotEqualTo(params.primitiveStringJava)
    assertThat(ReferencablePrimitive.unwrap(params.primitiveStringKt)).isEqualTo(params.value)
    params.primitiveStringJava?.let {
      assertThat(ReferencablePrimitive.unwrap(it)).isEqualTo(params.value)
    }
  }

  @Test
  fun unwrap_unknown_returnsNull() {
    val primitiveStringKt =
      "Primitive<com.something.UnknownPrimitiveType>(31337)"
    assertThat(ReferencablePrimitive.unwrap(primitiveStringKt)).isNull()
  }

  @Test
  fun isSupportedPrimitive_jdkBigInt_returnsFalse() {
    assertThat(isSupportedPrimitive(BigInteger::class)).isFalse()
  }

  @Test
  fun isSupportedPrimitive_jdkInstant_returnsFalse() {
    assertThat(isSupportedPrimitive(Instant::class)).isFalse()
  }

  @Test
  fun classRepresentationStringsAreSharedBetweenInstances() {
    val foo = ReferencablePrimitive(String::class, "Foo")
    val bar = ReferencablePrimitive(String::class, "Bar")
    assertThat(foo.klass).isSameInstanceAs(bar.klass)
  }

  @Test
  fun equals_floatWithinTolerance() {
    val one = ReferencablePrimitive(Float::class, 1.0f)
    assertThat(one).isEqualTo(ReferencablePrimitive(Float::class, 1.0f))
    assertThat(one).isNotEqualTo(ReferencablePrimitive(Float::class, 2.0f))
    assertThat(one).isEqualTo(ReferencablePrimitive(Float::class, 1.0f + FLOAT_TOLERANCE / 2))
    assertThat(one).isEqualTo(ReferencablePrimitive(Float::class, 1.0f - FLOAT_TOLERANCE / 2))
    assertThat(one).isNotEqualTo(ReferencablePrimitive(Float::class, 1.0f + FLOAT_TOLERANCE * 2))
    assertThat(one).isNotEqualTo(ReferencablePrimitive(Float::class, 1.0f - FLOAT_TOLERANCE * 2))
  }

  @Test
  fun equals_doubleWithinTolerance() {
    val one = ReferencablePrimitive(Double::class, 1.0)
    assertThat(one).isEqualTo(ReferencablePrimitive(Double::class, 1.0))
    assertThat(one).isNotEqualTo(ReferencablePrimitive(Double::class, 2.0))
    assertThat(one).isEqualTo(ReferencablePrimitive(Double::class, 1.0 + DOUBLE_TOLERANCE / 2))
    assertThat(one).isEqualTo(ReferencablePrimitive(Double::class, 1.0 - DOUBLE_TOLERANCE / 2))
    assertThat(one).isNotEqualTo(ReferencablePrimitive(Double::class, 1.0 + DOUBLE_TOLERANCE * 2))
    assertThat(one).isNotEqualTo(ReferencablePrimitive(Double::class, 1.0 - DOUBLE_TOLERANCE * 2))
  }

  // Regression test for bug where this was evaluating to true (but should be false, since they are
  // different Referencable subclasses): ReferencablePrimitive(<id>) == ReferenceImpl(<id>)
  @Test
  fun equals_otherImplWithSameId_returnsFalse() {
    val primitive = ReferencablePrimitive(String::class, "abc")
    val other = object : Referencable {
      override val id: ReferenceId = primitive.id
    }
    assertThat(primitive.id).isEqualTo(other.id)
    assertThat(primitive).isNotEqualTo(other)
  }

  data class UnwrapWrapParams(
    val value: ReferencablePrimitive<*>,
    val primitiveStringKt: String,
    val primitiveStringJava: String?
  ) {
    override fun toString(): String = value.klass
  }

  companion object {
    val DUMMY_MILLIS = 1609897400535L

    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val TEST_CASES = arrayOf(
      UnwrapWrapParams(
        value = 42.toByte().toReferencable(),
        primitiveStringJava = "Primitive<${java.lang.Byte::class.java.name}>(42)",
        primitiveStringKt = "Primitive<kotlin.Byte>(42)"
      ),
      UnwrapWrapParams(
        value = 42.toShort().toReferencable(),
        primitiveStringJava = "Primitive<${java.lang.Short::class.java.name}>(42)",
        primitiveStringKt = "Primitive<kotlin.Short>(42)"
      ),
      UnwrapWrapParams(
        value = 42.toReferencable(),
        primitiveStringJava = "Primitive<${java.lang.Integer::class.java.name}>(42)",
        primitiveStringKt = "Primitive<kotlin.Int>(42)"
      ),
      UnwrapWrapParams(
        value = 42L.toReferencable(),
        primitiveStringJava = "Primitive<${java.lang.Long::class.java.name}>(42)",
        primitiveStringKt = "Primitive<kotlin.Long>(42)"
      ),
      UnwrapWrapParams(
        value = 'a'.toReferencable(),
        primitiveStringJava = "Primitive<${java.lang.Character::class.java.name}>(a)",
        primitiveStringKt = "Primitive<kotlin.Char>(a)"
      ),
      UnwrapWrapParams(
        value = 42.1337f.toReferencable(),
        primitiveStringJava = "Primitive<${java.lang.Float::class.java.name}>(42.1337)",
        primitiveStringKt = "Primitive<kotlin.Float>(42.1337)"
      ),
      UnwrapWrapParams(
        value = 42.1337.toReferencable(),
        primitiveStringJava = "Primitive<${java.lang.Double::class.java.name}>(42.1337)",
        primitiveStringKt = "Primitive<kotlin.Double>(42.1337)"
      ),
      UnwrapWrapParams(
        value = "To be or not to be".toReferencable(),
        primitiveStringKt = "Primitive<kotlin.String>(To be or not to be)",
        primitiveStringJava = null
      ),
      UnwrapWrapParams(
        value = ") hey".toReferencable(),
        primitiveStringKt = "Primitive<kotlin.String>() hey)",
        primitiveStringJava = null
      ),
      UnwrapWrapParams(
        value = true.toReferencable(),
        primitiveStringKt = "Primitive<kotlin.Boolean>(true)",
        primitiveStringJava = "Primitive<${java.lang.Boolean::class.java.name}>(true)"
      ),
      UnwrapWrapParams(
        value = false.toReferencable(),
        primitiveStringKt = "Primitive<kotlin.Boolean>(false)",
        primitiveStringJava = "Primitive<${java.lang.Boolean::class.java.name}>(false)"
      ),
      UnwrapWrapParams(
        value = ByteArray(0).toReferencable(),
        primitiveStringKt = "Primitive<kotlin.ByteArray>()",
        primitiveStringJava = null
      ),
      UnwrapWrapParams(
        value = "hello world".toByteArray(Charsets.UTF_8).toReferencable(),
        primitiveStringKt = "Primitive<kotlin.ByteArray>(aGVsbG8gd29ybGQ=)",
        primitiveStringJava = null
      ),
      UnwrapWrapParams(
        value = BigInt("4213371337133713371337421337133713371337").toReferencable(),
        primitiveStringKt =
        "Primitive<${BigInt::class.java.name}>(4213371337133713371337421337133713371337)",
        primitiveStringJava = null
      ),
      UnwrapWrapParams(
        value = ArcsInstant.ofEpochMilli(31337).toReferencable(),
        primitiveStringKt = "Primitive<${ArcsInstant::class.java.name}>(31337)",
        primitiveStringJava = null
      )
    )
  }
}
