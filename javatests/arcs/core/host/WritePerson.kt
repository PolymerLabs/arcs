package arcs.core.host

import kotlinx.coroutines.CompletableDeferred
import java.lang.IllegalArgumentException

class WritePerson : AbstractWritePerson() {
    var wrote = false
    var firstStartCalled = false
    var shutdownCalled = false

    var deferred = CompletableDeferred<Boolean>()

    override suspend fun onFirstStart() {
        firstStartCalled = true
        wrote = false
        if (throws) {
            throw IllegalArgumentException("Boom!")
        }

        handles.person.onReady {
            handles.person.store(WritePerson_Person("John Wick"))
            wrote = true
            if (!deferred.isCompleted) {
                deferred.complete(true)
            }
        }
    }

    override fun onShutdown() {
        shutdownCalled = true
    }

    suspend fun await() {
        deferred.await()
    }

    companion object {
        var throws = false
    }
}
