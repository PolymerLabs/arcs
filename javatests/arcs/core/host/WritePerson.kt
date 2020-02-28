package arcs.core.host

import arcs.sdk.Handle

class WritePerson : AbstractWritePerson() {
    var wrote = false
    var createCalled = false
    var shutdownCalled = false;

    override suspend fun onCreate() {
        createCalled = true
        wrote = false
    }

    override fun onShutdown() {
        shutdownCalled = true
    }

    override suspend fun onHandleSync(handle: Handle, allSync: Boolean) {
        handles.person.store(WritePerson_Person("John Wick"))
        wrote = true
    }
}
