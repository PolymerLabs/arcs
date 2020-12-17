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
package arcs.sdk

import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.doReturn
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import kotlin.test.assertFailsWith
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class HandleHolderBaseTest {

  @Test
  fun handles_accessMissingHandle_throwsNoElemException() {
    val handleHolder = DummyHandleHolder()

    assertFailsWith<NoSuchElementException> {
      handleHolder.readHandle
    }.also {
      assertThat(it.message).isEqualTo(
        "Handle readHandle has not been initialized in TestParticle yet."
      )
    }
  }

  @Test
  fun handles_nameNotInEntitySpec_throwsNoElemException() {
    val handleHolder = DummyHandleHolder()

    assertFailsWith<NoSuchElementException> {
      handleHolder.handleButNotEntities
    }.also {
      assertThat(it.message).isEqualTo(
        "Particle TestParticle does not have a handle with name handleButNotEntities."
      )
    }
  }

  @Test
  fun dispatcher_noHandles_asserts() {
    val emptyHandleHolder = DummyHandleHolder()

    assertFailsWith<IllegalStateException> {
      emptyHandleHolder.dispatcher
    }.also {
      assertThat(it.message).isEqualTo(
        "No dispatcher available for a HandleHolder with no handles."
      )
    }
  }

  @Test
  fun dispatcher_someHandles_getsFirstHandlesDispatcher() {
    val handleHolder = DummyHandleHolder()
    val firstHandle = mock<Handle> {
      on { dispatcher } doReturn DUMMY_DISPATCHER_1
    }
    val secondHandle = mock<Handle> {
      on { dispatcher } doReturn DUMMY_DISPATCHER_2
    }
    handleHolder.setHandle("readHandle", firstHandle)
    handleHolder.setHandle("writeHandle", secondHandle)

    val actual = handleHolder.dispatcher

    assertThat(actual).isSameInstanceAs(DUMMY_DISPATCHER_1)
  }

  @Test
  fun getEntitySpec_handleNameNotInSpec_throwsNoElemException() {
    val handleHolder = DummyHandleHolder()

    assertFailsWith<NoSuchElementException> {
      handleHolder.getEntitySpecs("notInSpec")
    }.also {
      assertThat(it.message).isEqualTo(
        "Particle TestParticle does not have a handle with name notInSpec."
      )
    }
  }

  @Test
  fun getEntitySpec_handleNameInSpec_returnsSpec() {
    val handleHolder = DummyHandleHolder()

    assertThat(handleHolder.getEntitySpecs("readHandle")).isNotEmpty()
  }

  @Test
  fun getHandle_handleNameNotInSpec_throwsNoElemException() {
    val handleHolder = DummyHandleHolder()
    handleHolder.setHandle("readHandle", mock())

    assertFailsWith<IllegalArgumentException> {
      handleHolder.setHandle("readHandle", mock())
    }.also {
      assertThat(it.message).isEqualTo("TestParticle.readHandle has already been initialized.")
    }
  }

  @Test
  fun getHandle_handleNameInSpec_returnsHandle() {
    val handleHolder = DummyHandleHolder()
    val mock = mock<Handle>()
    handleHolder.setHandle("writeHandle", mock)

    assertThat(handleHolder.getHandle("writeHandle")).isSameInstanceAs(mock)
  }

  @Test
  fun setHandle_handelAlreadySet_asserts() {
    val handleHolder = DummyHandleHolder()
    handleHolder.setHandle("writeHandle", mock())

    assertFailsWith<IllegalArgumentException> {
      handleHolder.setHandle("writeHandle", mock())
    }.also {
      assertThat(it.message).isEqualTo(
        "TestParticle.writeHandle has already been initialized."
      )
    }
  }

  @Test
  fun setHandle_handelNameNotInSpec_throwsNoElemException() {
    val handleHolder = DummyHandleHolder()

    assertFailsWith<NoSuchElementException> {
      handleHolder.setHandle("handleButNotEntities", mock())
    }.also {
      assertThat(it.message).isEqualTo(
        "Particle TestParticle does not have a handle with name handleButNotEntities."
      )
    }
  }

  @Test
  fun setHandle_handelNameInSpec_success() {
    val handleHolder = DummyHandleHolder()
    val mock = mock<Handle>()

    handleHolder.setHandle("writeHandle", mock)

    assertThat(handleHolder.writeHandle).isSameInstanceAs(mock)
  }

  @Test
  fun isEmpty_delegatesToHandlesMap() {
    val handleHolder = DummyHandleHolder()

    assertThat(handleHolder.isEmpty()).isTrue()

    handleHolder.setHandle("readHandle", mock())

    assertThat(handleHolder.isEmpty()).isFalse()
  }

  @Test
  fun createForeignReference_noHandles_asserts() = runBlockingTest {
    val handleHolder = DummyHandleHolder()

    assertFailsWith<IllegalStateException> {
      handleHolder.createForeignReference<EntityBase>(mock(), "someId")
    }
  }

  @Test
  fun createForeignReference_someHandles_success() = runBlockingTest {
    val handleHolder = DummyHandleHolder()
    val mock = mock<Handle>()
    handleHolder.setHandle("readHandle", mock)

    handleHolder.readHandle.createForeignReference<EntityBase>(mock(), "someId")

    verify(mock, times(1)).createForeignReference<EntityBase>(any(), any())
  }

  companion object {
    val DUMMY_DISPATCHER_1 = Dispatchers.Default
    val DUMMY_DISPATCHER_2 = Dispatchers.Main

    class DummyHandleHolder : HandleHolderBase(
      "TestParticle",
      mapOf(
        "readHandle" to setOf(mock()),
        "writeHandle" to setOf(mock()),
        "entityButNotHandles" to setOf(mock())
      )
    ) {
      val readHandle by handles
      val writeHandle by handles
      val handleButNotEntities by handles
    }
  }
}
