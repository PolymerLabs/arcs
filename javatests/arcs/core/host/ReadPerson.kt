package arcs.core.host

import arcs.core.entity.Handle
import kotlinx.coroutines.CompletableDeferred

class ReadPerson : AbstractReadPerson() {
    var name = ""
    var firstStartCalled = false
    var shutdownCalled = false

    var deferred = CompletableDeferred<Boolean>()

    override suspend fun onFirstStart() {
        firstStartCalled = true
        name = ""
    }

    override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (!allSynced) return

        handles.person.onReady {
            name = handles.person.fetch()?.name ?: ""
            if (name != "") {
                if (!deferred.isCompleted) {
                    deferred.complete(true)
                }
            }
        }
        handles.person.onUpdate {
            name = it?.name ?: ""
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
