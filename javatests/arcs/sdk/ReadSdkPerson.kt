package arcs.sdk

class ReadSdkPerson : AbstractReadSdkPerson() {
    var name = ""
    var firstStartCalled = false
    var shutdownCalled = false

    override suspend fun onFirstStart() {
        firstStartCalled = true
        name = ""
        handles.person.onUpdate {
            name = handles.person.fetch()?.name ?: ""
        }
    }

    override fun onShutdown() {
        shutdownCalled = true
    }
}
