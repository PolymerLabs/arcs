package arcs.core.host

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async
import java.lang.IllegalArgumentException

class WritePerson : AbstractWritePerson() {
    var wrote = false
    var createCalled = false
    var shutdownCalled = false

    var deferred = CompletableDeferred<Boolean>()

    override suspend fun onCreate() {
        createCalled = true
        wrote = false
        if (throws) {
            throw IllegalArgumentException("Boom!")
        }

        handles.person.onReady {
            GlobalScope.async {
                handles.person.store(WritePerson_Person("John Wick"))
                wrote = true
                if (!deferred.isCompleted) {
                    deferred.complete(true)
                }
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
