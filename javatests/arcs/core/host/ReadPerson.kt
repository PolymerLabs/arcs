package arcs.core.host

import kotlinx.coroutines.runBlocking

class ReadPerson : AbstractReadPerson() {
    var name = ""
    var createCalled = false
    var shutdownCalled = false

    override suspend fun onCreate() {
        createCalled = true
        name = ""
        handles.person.onUpdate {
            runBlocking {
                name = handles.person.fetch()?.name ?: ""
            }
        }
    }

    override fun onShutdown() {
        shutdownCalled = true
    }
}
