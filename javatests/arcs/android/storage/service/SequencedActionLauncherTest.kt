package arcs.android.storage.service

import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class SequencedActionLauncherTest {
  private lateinit var scope: CoroutineScope
  private lateinit var launcher: SequencedActionLauncher

  @Before
  fun setUp() {
    scope = CoroutineScope(Dispatchers.Default)
    launcher = SequencedActionLauncher(scope)
  }

  @After
  fun tearDown() {
    scope.cancel()
  }

  @Test
  fun launch_launchesJobsInOrder() {
    val callOrder = atomic(listOf<String>())

    launcher.launch {
      callOrder.update {
        assertThat(it).isEmpty()
        delay(100)
        it + listOf("first")
      }
    }
    launcher.launch {
      callOrder.update {
        assertThat(it).containsExactly("first")
        delay(100)
        it + listOf("second")
      }
    }
    launcher.launch {
      callOrder.update {
        assertThat(it).containsExactly("first", "second").inOrder()
        delay(100)
        it + listOf("third")
      }
    }

    runBlocking {
      launcher.waitUntilDone()
    }

    assertThat(callOrder.value).containsExactly("first", "second", "third").inOrder()
  }

  @Test
  fun waitTillDone_waitsForEverythingToFinish() {
    val start = JvmTime.currentTimeMillis
    launcher.launch { delay(100) }
    launcher.launch { delay(100) }
    launcher.launch { delay(100) }

    runBlocking {
      launcher.waitUntilDone()
    }
    val end = JvmTime.currentTimeMillis

    assertThat(end - start).isAtLeast(300)
  }
}
