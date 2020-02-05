package arcs.android.storage.ttl

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import arcs.core.util.TaggedLog

class PeriodicCleanupTask(
    appContext: Context,
    workerParams: WorkerParameters
) : Worker(appContext, workerParams) {

    private val log = TaggedLog { this.toString() }
    init {
        log.debug { "Created." }
    }

    override fun doWork(): Result {
        log.debug { "Running." }
        // TODO (b/146012246): find and delete expired entities.

        // Indicate whether the task finished successfully with the Result
        return Result.success()
    }

    companion object {
        const val WORKER_TAG = "PeriodicCleanupTask"
    }
}
