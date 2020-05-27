package arcs.core.host

import arcs.jvm.host.TargetHost

@TargetHost(TestingJvmProdHost::class)
class PurePerson : AbstractPurePerson() {
    override suspend fun onFirstStart() {
        handles.inputPerson.onUpdate {
            val name = handles.inputPerson.fetch()?.name
            if (name != null) {
                handles.outputPerson.store(PurePerson_OutputPerson("Hello $name"))
            }
        }
    }
}
