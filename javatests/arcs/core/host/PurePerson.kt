package arcs.core.host

import arcs.jvm.host.TargetHost

@TargetHost(TestingJvmProdHost::class)
class PurePerson : AbstractPurePerson() {
    override suspend fun onFirstStart() {
        handles.inputPerson.onUpdate {
            val name = it?.name
            println("Saying hello to $name")
            if (name != null) {
                handles.outputPerson.store(PurePerson_OutputPerson("Hello $name"))
            }
        }
    }
}
