package arcs.android.storage.service

import arcs.android.crdt.CrdtExceptionProto
import arcs.android.util.decodeProto
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.argumentCaptor
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyZeroInteractions
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class IResultCallbackFunctionsTest {
  private lateinit var resultCallback: IResultCallback

  @Before
  fun setUp() {
    resultCallback = mock()
  }

  @Test
  fun wrapException_successfulAction_invokesCallbackWithNull() {
    var actionWasRun = false

    resultCallback.wrapException("error message") {
      verifyZeroInteractions(resultCallback)
      actionWasRun = true
    }

    assertThat(actionWasRun).isTrue()
    verify(resultCallback).onResult(null)
  }

  @Test
  fun wrapException_exceptionThrown_invokesCallbackWithException() {
    var actionWasRun = false

    resultCallback.wrapException("error message") {
      verifyZeroInteractions(resultCallback)
      actionWasRun = true
      throw Exception()
    }

    assertThat(actionWasRun).isTrue()
    val captor = argumentCaptor<ByteArray>()
    verify(resultCallback).onResult(captor.capture())
    val message = getExceptionMessage(captor.allValues.single())
    assertThat(message).contains("error message")
  }

  private companion object {
    /** Converts decodes the given bytes into a [CrdtExceptionProto] and returns its message. */
    private fun getExceptionMessage(resultBytes: ByteArray): String {
      val proto = decodeProto(resultBytes, CrdtExceptionProto.getDefaultInstance())
      return proto.message
    }
  }
}
