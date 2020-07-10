package arcs.core.host

import kotlinx.coroutines.CompletableDeferred

class ReadPerson : AbstractReadPerson() {
    var name = ""
    var firstStartCalled = false
    var shutdownCalled = false

    var deferred = CompletableDeferred<Boolean>()

    override fun onFirstStart() {
        firstStartCalled = true
    }

    override fun onStart() {
        handles.person.onUpdate {
            name = handles.person.fetch()?.name ?: ""
            if (name != "") {
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
}
