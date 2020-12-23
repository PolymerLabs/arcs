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
import com.nhaarman.mockitokotlin2.doReturn
import com.nhaarman.mockitokotlin2.mock
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
  fun handles_accessMissingHandle_throwsException() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock())
    )

    assertFailsWith(
      NoSuchElementException::class,
      "Handle readHandle has not been initialized in TestParticle yet."
    ) {
      handleHolder.getHandle("readHandle")
    }
  }

  @Test
  fun handles_nameNotInEntitySpec_throwsException() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock())
    )

    assertFailsWith(
      NoSuchElementException::class,
      "Particle TestParticle does not have a handle with name handleButNotEntities."
    ) {
      handleHolder.getHandle("handleButNotEntities")
    }
  }

  @Test
  fun dispatcher_noHandles_asserts() {
    val emptyHandleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("inSpec" to mock())
    )

    assertFailsWith(
      IllegalStateException::class,
      "No dispatcher available for a HandleHolder with no handles."
    ) {
      emptyHandleHolder.dispatcher
    }
  }

  @Test
  fun dispatcher_someHandles_getsFirstHandlesDispatcher() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )
    val firstHandle = mock<Handle> {
      on { dispatcher } doReturn Dispatchers.Main
    }
    val secondHandle = mock<Handle> {
      on { dispatcher } doReturn Dispatchers.Default
    }
    handleHolder.setHandle("readHandle", firstHandle)
    handleHolder.setHandle("writeHandle", secondHandle)

    val actual = handleHolder.dispatcher

    assertThat(actual).isSameInstanceAs(Dispatchers.Main)
  }

  @Test
  fun getEntitySpec_handleNameNotInSpec_throwsException() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )

    assertFailsWith(
      NoSuchElementException::class,
      "Particle TestParticle does not have a handle with name notInSpec."
    ) {
      handleHolder.getEntitySpecs("notInSpec")
    }
  }

  @Test
  fun getEntitySpec_handleNameInSpec_returnsSpec() {
    val mock = mock<Set<EntitySpec<EntityBase>>>()
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock)
    )

    assertThat(handleHolder.getEntitySpecs("readHandle")).isSameInstanceAs(mock)
  }

  @Test
  fun setHandle_whenAlreadyInitialized_throwsException() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock())
    )

    handleHolder.setHandle("readHandle", mock())

    assertFailsWith(
      IllegalArgumentException::class,
      "TestParticle.readHandle has already been initialized."
    ) {
      handleHolder.setHandle("readHandle", mock())
    }
  }

  @Test
  fun getHandle_handleNameInSpec_returnsHandle() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("writeHandle" to mock())
    )
    val mock = mock<Handle>()
    handleHolder.setHandle("writeHandle", mock)

    assertThat(handleHolder.getHandle("writeHandle")).isSameInstanceAs(mock)
  }

  @Test
  fun setHandle_handleAlreadySet_asserts() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("writeHandle" to mock())
    )
    handleHolder.setHandle("writeHandle", mock())

    assertFailsWith(
      IllegalArgumentException::class,
      "TestParticle.writeHandle has already been initialized."
    ) {
      handleHolder.setHandle("writeHandle", mock())
    }
  }

  @Test
  fun setHandle_handleNameNotInSpec_throwsException() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock())
    )

    assertFailsWith(
      NoSuchElementException::class,
      "Particle TestParticle does not have a handle with name handleButNotEntities."
    ) {
      handleHolder.setHandle("handleButNotEntities", mock())
    }
  }

  @Test
  fun setHandle_handleNameInSpec_success() {
    class DummyHandle : HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("writeHandle" to mock())
    ) {
      val writeHandle: Handle by handles
    }

    val handleHolder = DummyHandle()
    val mock = mock<Handle>()

    handleHolder.setHandle("writeHandle", mock)

    assertThat(handleHolder.writeHandle).isSameInstanceAs(mock)
  }

  @Test
  fun detach_allHandles_getUnregistered() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )
    val readMock = mock<Handle>()
    val writeMock = mock<Handle>()
    handleHolder.setHandle("readHandle", readMock)
    handleHolder.setHandle("writeHandle", writeMock)

    handleHolder.detach()

    verify(readMock).unregisterForStorageEvents()
    verify(writeMock).unregisterForStorageEvents()
  }

  @Test
  fun reset_noHandlesPresent_remainsEmpty() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )

    assertThat(handleHolder.handles).isEmpty()

    handleHolder.reset()

    assertThat(handleHolder.handles).isEmpty()
  }

  @Test
  fun reset_oneHandle_getUnregistered() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )
    val readMock = mock<Handle>()
    handleHolder.setHandle("readHandle", readMock)

    handleHolder.reset()

    verify(readMock).unregisterForStorageEvents()
  }

  @Test
  fun reset_oneHandle_getClosed() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )
    val writeMock = mock<Handle>()
    handleHolder.setHandle("writeHandle", writeMock)

    handleHolder.reset()

    verify(writeMock).close()
  }

  @Test
  fun reset_allHandles_getUnregistered() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )
    val readMock = mock<Handle>()
    val writeMock = mock<Handle>()
    handleHolder.setHandle("readHandle", readMock)
    handleHolder.setHandle("writeHandle", writeMock)

    handleHolder.reset()

    verify(readMock).unregisterForStorageEvents()
    verify(writeMock).unregisterForStorageEvents()
  }

  @Test
  fun reset_allHandles_getClosed() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )
    val readMock = mock<Handle>()
    val writeMock = mock<Handle>()
    handleHolder.setHandle("readHandle", readMock)
    handleHolder.setHandle("writeHandle", writeMock)

    handleHolder.reset()

    verify(readMock).close()
    verify(writeMock).close()
  }

  @Test
  fun reset_allHandles_allElementsRemoved() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf(
        "readHandle" to mock(),
        "writeHandle" to mock()
      )
    )
    handleHolder.setHandle("readHandle", mock())
    handleHolder.setHandle("writeHandle", mock())
    assertThat(handleHolder.handles).isNotEmpty()

    handleHolder.reset()

    assertThat(handleHolder.handles).isEmpty()
  }

  @Test
  fun isEmpty_noHandles_returnsTrue() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock())
    )

    assertThat(handleHolder.isEmpty()).isTrue()
  }

  @Test
  fun isEmpty_someHandles_returnsFalse() {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock())
    )

    handleHolder.setHandle("readHandle", mock())

    assertThat(handleHolder.isEmpty()).isFalse()
  }

  @Test
  fun createForeignReference_noHandles_asserts() = runBlockingTest {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock())
    )

    assertFailsWith<IllegalStateException> {
      handleHolder.createForeignReference<EntityBase>(mock(), "someId")
    }
  }

  @Test
  fun createForeignReference_someHandles_success() = runBlockingTest {
    val handleHolder = HandleHolderBase(
      "TestParticle",
      entitySpecs = mapOf("readHandle" to mock())
    )
    val readMockHandle = mock<Handle>()
    val entitySpecMock = mock<EntitySpec<EntityBase>>()
    handleHolder.setHandle("readHandle", readMockHandle)

    handleHolder.createForeignReference(entitySpecMock, "someId")

    verify(readMockHandle).createForeignReference(entitySpecMock, "someId")
  }
}
