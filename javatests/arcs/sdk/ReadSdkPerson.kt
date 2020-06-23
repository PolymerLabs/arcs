package arcs.sdk

class ReadSdkPerson : AbstractReadSdkPerson() {
    var name = ""
    var onStartCalled = false
    var shutdownCalled = false

    override fun onStart() {
        onStartCalled = true
        name = ""
        handles.person.onUpdate {
            name = handles.person.fetchZZ()?.name ?: ""
        }
    }

    override fun onShutdown() {
        shutdownCalled = true
    }
}
