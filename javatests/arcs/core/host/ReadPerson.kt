package arcs.core.host

import arcs.sdk.Handle

class ReadPerson : AbstractReadPerson() {
    var name = ""
    var createCalled = false
    var shutdownCalled = false

    override suspend fun onCreate() {
        createCalled = true
        name = ""
    }

    override fun onShutdown() {
        shutdownCalled = true
    }

    override suspend fun onHandleUpdate(handle: Handle) {
        name = handles.person.fetch()?.name ?: ""
    }

    override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
        name = handles.person.fetch()?.name ?: ""
    }
}
