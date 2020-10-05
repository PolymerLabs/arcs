package arcs.android.storage.service

import com.google.common.truth.Truth.assertThat
import java.util.Random
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class MutexOperationQueueTest {
  private val random = Random(System.currentTimeMillis())

  @Test
  fun orderingIsMaintained_whenFirstJobTakesAWhile() {
    val scope = CoroutineScope(Dispatchers.Default)
    val queue = MutexOperationQueue(scope)

    val secondEnqueued = CompletableDeferred<Unit>()
    val callOrder = atomic(listOf<String>())

    val firstJob = suspend {
      delay(100)
      secondEnqueued.await()
      callOrder.update { it + listOf("first") }
      Unit
    }
    val secondJob = suspend {
      callOrder.update { it + listOf("second") }
      Unit
    }
    runBlocking {
      queue.launch(firstJob)
      val toJoin = queue.launch(secondJob)
      secondEnqueued.complete(Unit)
      toJoin.join()
    }

    assertThat(callOrder.value).containsExactlyElementsIn(listOf("first", "second")).inOrder()

    scope.cancel()
  }

  @Test
  fun ordering_stressTest() {
    val scope = CoroutineScope(Dispatchers.Default)
    val queue = MutexOperationQueue(scope)

    val callOrder = atomic(listOf<String>())

    val jobsToDo = (0 until 1000).map { jobNum ->
      suspend {
        delay(random.nextInt(49).toLong() + 1)
        callOrder.update { it + listOf("$jobNum") }
        Unit
      }
    }

    runBlocking {
      val jobs = jobsToDo.map { queue.launch(it) }
      jobs.joinAll()
    }

    assertThat(callOrder.value).containsExactlyElementsIn((0 until 1000).map { "$it" }).inOrder()

    scope.cancel()
  }
}
