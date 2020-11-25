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

  override fun invoke(arcId: String): Scheduler {
    return Scheduler(
      providerCoroutineContext +
        CoroutineName("ArcId::$arcId")
    )
  }

  override fun cancelAll() = synchronized(this) {
    providerParentJob.cancel()
  }
}
