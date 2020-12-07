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
@file:Suppress("unused")

package arcs.core.host

import arcs.core.data.Plan
import arcs.core.host.api.HandleHolder
import arcs.sdk.Particle
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import kotlin.reflect.KClass

@ExperimentalCoroutinesApi
@RunWith(Parameterized::class)
class UtilsTest(private val params: Params) {
  @Test
  fun kclass_className() {
    assertThat(params.classNameClass.className()).isEqualTo(params.expectedClassName)
  }

  @Test
  fun noargParticleConstructor_toRegistration() = runBlockingTest {
    var called = false
    val ctor: () -> MyParticle = {
      called = true
      MyParticle()
    }

    val registration = ctor.toRegistration()
    assertThat(called).isFalse()
    assertThat(registration.first).isEqualTo(MyParticle::class.toParticleIdentifier())

    registration.second(null)
    assertThat(called).isTrue()
  }

  @Test
  fun planParticleBasedConstructor_toRegistration() = runBlockingTest {
    var calledWithParticle: Plan.Particle? = null
    val planParticle = Plan.Particle("name", "location", emptyMap())
    val ctor: (planParticle: Plan.Particle?) -> MyParticle = { particle ->
      calledWithParticle = particle
      MyParticle()
    }

    val registration = ctor.toRegistration()
    assertThat(calledWithParticle).isNull()
    assertThat(registration.first).isEqualTo(MyParticle::class.toParticleIdentifier())

    registration.second(planParticle)
    assertThat(calledWithParticle).isEqualTo(planParticle)
  }

  data class Params(
    val testName: String,
    val classNameClass: KClass<*>,
    val expectedClassName: String
  ) {
    override fun toString(): String = testName
  }

  class MyParticle : Particle {
    override val handles: HandleHolder
      get() = throw UnsupportedOperationException()
  }

  class NestedClass

  class NestedGenericClass<T : Any>

  data class NestedDataClass(val foo: Int)

  data class NestedGenericDataClass<T : Any>(val foo: Int)

  interface NestedInterface

  interface NestedGenericInterface<T : Any>

  enum class NestedEnum

  inner class InnerClass

  inner class GenericInnerClass<T : Any>

  companion object {
    @JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMS = arrayOf(
      Params(
        testName = "class",
        classNameClass = NotNestedClass::class,
        expectedClassName = "arcs.core.host.NotNestedClass"
      ),
      Params(
        testName = "interface",
        classNameClass = NotNestedInterface::class,
        expectedClassName = "arcs.core.host.NotNestedInterface"
      ),
      Params(
        testName = "data class",
        classNameClass = NotNestedDataClass::class,
        expectedClassName = "arcs.core.host.NotNestedDataClass"
      ),
      Params(
        testName = "generic class",
        classNameClass = NotNestedGenericClass::class,
        expectedClassName = "arcs.core.host.NotNestedGenericClass"
      ),
      Params(
        testName = "generic interface",
        classNameClass = NotNestedGenericInterface::class,
        expectedClassName = "arcs.core.host.NotNestedGenericInterface"
      ),
      Params(
        testName = "generic data class",
        classNameClass = NotNestedGenericDataClass::class,
        expectedClassName = "arcs.core.host.NotNestedGenericDataClass"
      ),
      Params(
        testName = "enum",
        classNameClass = NotNestedEnum::class,
        expectedClassName = "arcs.core.host.NotNestedEnum"
      ),
      Params(
        testName = "nested class",
        classNameClass = NestedClass::class,
        expectedClassName = "arcs.core.host.UtilsTest.NestedClass"
      ),
      Params(
        testName = "nested interface",
        classNameClass = NestedInterface::class,
        expectedClassName = "arcs.core.host.UtilsTest.NestedInterface"
      ),
      Params(
        testName = "nested data class",
        classNameClass = NestedDataClass::class,
        expectedClassName = "arcs.core.host.UtilsTest.NestedDataClass"
      ),
      Params(
        testName = "nested generic class",
        classNameClass = NestedGenericClass::class,
        expectedClassName = "arcs.core.host.UtilsTest.NestedGenericClass"
      ),
      Params(
        testName = "nested generic interface",
        classNameClass = NestedGenericInterface::class,
        expectedClassName = "arcs.core.host.UtilsTest.NestedGenericInterface"
      ),
      Params(
        testName = "nested generic data class",
        classNameClass = NestedGenericDataClass::class,
        expectedClassName = "arcs.core.host.UtilsTest.NestedGenericDataClass"
      ),
      Params(
        testName = "nested enum",
        classNameClass = NestedEnum::class,
        expectedClassName = "arcs.core.host.UtilsTest.NestedEnum"
      ),
      Params(
        testName = "inner class",
        classNameClass = InnerClass::class,
        expectedClassName = "arcs.core.host.UtilsTest.InnerClass"
      ),
      Params(
        testName = "generic inner class",
        classNameClass = GenericInnerClass::class,
        expectedClassName = "arcs.core.host.UtilsTest.GenericInnerClass"
      )
    )
  }
}

class NotNestedClass

class NotNestedGenericClass<T : Any>

data class NotNestedDataClass(val foo: Int)

data class NotNestedGenericDataClass<T : Any>(val foo: Int)

interface NotNestedInterface

interface NotNestedGenericInterface<T : Any>

enum class NotNestedEnum
