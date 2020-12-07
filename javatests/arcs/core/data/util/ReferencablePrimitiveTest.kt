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

import arcs.core.data.util.ReferencablePrimitive.Companion.isSupportedPrimitive
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.math.BigInteger
import java.time.Instant

@RunWith(Parameterized::class)
class ReferencablePrimitiveTest(private val params: UnwrapWrapParams) {
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
    assertThat(foo.klassRepr).isSameInstanceAs(bar.klassRepr)
  }

  data class UnwrapWrapParams(
    val value: ReferencablePrimitive<*>,
    val primitiveStringKt: String,
    val primitiveStringJava: String?
  ) {
    override fun toString(): String = value.klass.toString()
  }

  companion object {
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
