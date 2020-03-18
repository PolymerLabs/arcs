package arcs.core.host

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking

class ReadPerson : AbstractReadPerson() {
    var name = ""
    var createCalled = false
    var shutdownCalled = false

    var deferred = CompletableDeferred<Boolean>()

    override suspend fun onCreate() {
        createCalled = true
        name = ""
        handles.person.onUpdate {
            GlobalScope.async {
                name = handles.person.fetch()?.name ?: ""
                if (name != "") {
                    if (!deferred.isCompleted) {
                        deferred.complete(true)
                    }
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
}
