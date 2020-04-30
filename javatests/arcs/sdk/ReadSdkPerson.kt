package arcs.sdk

class ReadSdkPerson : AbstractReadSdkPerson() {
    var name = ""
    var createCalled = false
    var shutdownCalled = false

    override suspend fun onCreate() {
        createCalled = true
        name = ""
        handles.person.onUpdate {
            name = handles.person.fetch()?.name ?: ""
        }
    }

    override fun onShutdown() {
        shutdownCalled = true
    }
}
