package arcs.core.host

import arcs.core.util.Scheduler
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.Job

/**
 * Simple implementation of a [SchedulerProvider].
 */
class SimpleSchedulerProvider(
  baseCoroutineContext: CoroutineContext
) : SchedulerProvider {
  private val providerParentJob = Job(baseCoroutineContext[Job])
  private val providerCoroutineContext = baseCoroutineContext + providerParentJob
  private val schedulers = mutableMapOf<String, Scheduler>()

  override fun invoke(arcId: String): Scheduler = synchronized(this) {
    return schedulers.getOrPut(arcId) {
      val schedulerJob = Job(providerParentJob).apply {
        // Remove the scheduler from the internal map if its job completes.
        invokeOnCompletion {
          synchronized(this) {
            schedulers.remove(arcId)
          }
        }
      }

      Scheduler(
        providerCoroutineContext +
          schedulerJob +
          CoroutineName("ArcId::$arcId")
      )
    }
  }

  override fun cancelAll() = synchronized(this) {
    providerParentJob.cancel()
  }
}
