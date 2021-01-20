package arcs.sdk

import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

typealias TestHandleHolder = AbstractTestParticle.Handles

/**
 * The tests in this suite test functionality specific to the automatic properties created by the
 * code generation of a HandleHolder inside of a particle. This isn't a comprehensive test of all
 * HandleHolderBase-provided functionality.
 */
@RunWith(JUnit4::class)
class GeneratedHandleHolderTest {
  @Test
  fun getters_throwException_whenUninitialized() {
    val handleHolder = TestHandleHolder()
    assertFailsWithHandleException { handleHolder.readHandle }
    assertFailsWithHandleException { handleHolder.writeHandle }
    assertFailsWithHandleException { handleHolder.readWriteHandle }
    assertFailsWithHandleException { handleHolder.readCollectionHandle }
    assertFailsWithHandleException { handleHolder.writeCollectionHandle }
    assertFailsWithHandleException { handleHolder.readWriteCollectionHandle }
    assertFailsWithHandleException { handleHolder.queryCollectionHandle }
    assertFailsWithHandleException { handleHolder.readQueryCollectionHandle }
    assertFailsWithHandleException { handleHolder.writeQueryCollectionHandle }
    assertFailsWithHandleException { handleHolder.readWriteQueryCollectionHandle }
  }

  @Test
  fun getters_returnHandle_afterInitialization() {
    val handleHolder = TestHandleHolder()

    handleHolder.assertSetHandleReturnedByGetter("readHandle") {
      it.readHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("writeHandle") {
      it.writeHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("readWriteHandle") {
      it.readWriteHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("readCollectionHandle") {
      it.readCollectionHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("writeCollectionHandle") {
      it.writeCollectionHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("readWriteCollectionHandle") {
      it.readWriteCollectionHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("queryCollectionHandle") {
      it.queryCollectionHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("readQueryCollectionHandle") {
      it.readQueryCollectionHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("writeQueryCollectionHandle") {
      it.writeQueryCollectionHandle
    }
    handleHolder.assertSetHandleReturnedByGetter("readWriteQueryCollectionHandle") {
      it.readWriteQueryCollectionHandle
    }
  }

  @Test
  fun setHandle_whenHandleNameDoesntExist_throwsException() {
    val handleHolder = TestHandleHolder()

    assertFailsWithHandleException {
      handleHolder.setHandle("handleNotInParticle", mock())
    }
  }

  @Test
  fun getter_afterReset_throwsException() {
    val handleHolder = TestHandleHolder()
    handleHolder.assertSetHandleReturnedByGetter("readHandle") { it.readHandle }

    handleHolder.reset()

    assertFailsWithHandleException {
      handleHolder.readHandle
    }
  }

  private inline fun <reified T : Handle> TestHandleHolder.assertSetHandleReturnedByGetter(
    name: String,
    getter: (TestHandleHolder) -> T
  ) {
    val mock = mock<T>()
    setHandle(name, mock)
    assertThat(getter(this)).isEqualTo(mock)
  }

  private fun assertFailsWithHandleException(block: () -> Unit) {
    assertFailsWith<NoSuchElementException>(block = block)
  }
}
