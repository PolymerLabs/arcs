package arcs.core.host

import java.lang.IllegalArgumentException
import kotlinx.coroutines.CompletableDeferred

class WritePerson : AbstractWritePerson() {
    var wrote = false
    var firstStartCalled = false
    var shutdownCalled = false

    var deferred = CompletableDeferred<Boolean>()

    override fun onFirstStart() {
        firstStartCalled = true
        if (throws) {
            throw IllegalArgumentException("Boom!")
        }
    }

    override fun onReady() {
        handles.person.store(WritePerson_Person("John Wick"))
        wrote = true
        if (!deferred.isCompleted) {
            deferred.complete(true)
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
