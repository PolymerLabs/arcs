package arcs.core.storage.database

import arcs.core.common.CompositeException
import arcs.core.testutil.assertSuspendingThrows
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class DatabaseManagerTest {
  private val databaseManager = FakeDatabaseManager()

  private val dbNames = (1..100).map { "db$it" }

  @Before
  fun setup() {
    databaseManager.registry.run {
      dbNames.forEach {
        register(it, true)
      }
    }
  }

  @Test
  fun runOnAllDatabasesWaitsForAll() = runBlockingTest {
    val visited = mutableListOf<String>()
    databaseManager.runOnAllDatabases { name, _ ->
      delay(1)
      visited.add(name)
    }
    assertThat(visited).containsExactlyElementsIn(dbNames)
  }

  @Test
  fun runOnAllDatabasesPropagatesException() = runBlockingTest {
    val visited = mutableListOf<String>()

    val throwFor = setOf("db12", "db42", "db66", "db88")
    val exception = assertSuspendingThrows(CompositeException::class) {
      databaseManager.runOnAllDatabases { name, _ ->
        if (name in throwFor) {
          throw FakeException(name)
        }
        delay(1)
        visited.add(name)
      }
    }
    val expectExceptions = throwFor.map { FakeException(it) }
    assertThat(exception.exceptions).containsExactlyElementsIn(expectExceptions)
    assertThat(visited).containsExactlyElementsIn(dbNames - throwFor)
  }

  // We use [runBlocking] here instead of [runBlockingTest] since we want to create a separate
  // scope that doesn't trigger cancellation of the wrapping scope.
  @Test
  fun runOnAllDatabasesFailureCancelsCallerScope() = runBlocking<Unit> {
    // The goal of this test is to show that when we use runOnAllDatabases,
    // 1) All database jobs will complete, even if an exception is thrown.
    // 2) The *calling scope* of runOnAllDatabases will still be cancelled.
    //
    // In other words, we want to give all of the jobs a chance to run, but we still want
    // normal failure behavior if one or more failures occur.

    // Here we create a new scope that's separate from the one driving this test.
    // That way, if an exception is thrown, it won't cancel our test, and we can
    // inspect the state of the job.
    val otherJob = Job()
    val otherScope = CoroutineScope(otherJob)

    val throwFor = setOf("db12", "db42", "db66", "db88")

    // We launch a job in that separate scope.
    otherScope.launch {
      databaseManager.runOnAllDatabases { name, _ ->
        if (name in throwFor) {
          throw FakeException(name)
        }
      }
    }

    // Here we wait for it to complete
    otherJob.join()

    // We expect it to be cancelled, not completed, since an exception was thrown.
    assertThat(otherJob.isCancelled)
  }

  data class FakeException(val name: String) : Exception()
}
