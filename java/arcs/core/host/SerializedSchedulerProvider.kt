package arcs.core.host

import arcs.core.util.Scheduler
import kotlinx.coroutines.Job
import kotlin.coroutines.CoroutineContext

/**
 * Provides schedulers that will dispatch jobs onto the threads underlying the provided parent
 * CoroutineContext's dispatcher, but using a [SerializedDispatcher] so that only one can run
 * at a time.
 */
class SimpleSchedulerProvider(
    private val baseCoroutineContext: CoroutineContext
) : SchedulerProvider {
    private val schedulers = mutableMapOf<String, Scheduler>()

    @Synchronized
    override fun invoke(arcId: String): Scheduler = schedulers.getOrPut(arcId) {
        val job = Job(baseCoroutineContext[Job])
        job.invokeOnCompletion {
            schedulers.remove(arcId)
        }

        val schedulerContext = baseCoroutineContext + job
        Scheduler(schedulerContext)
    }

    @Synchronized
    override fun cancelAll() {
        schedulers.values.forEach { it.cancel() }
    }
}
