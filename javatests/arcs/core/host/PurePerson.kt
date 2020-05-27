package arcs.core.host

import arcs.jvm.host.TargetHost

@TargetHost(TestingJvmProdHost::class)
class PurePerson : AbstractPurePerson() {
    override fun onStart() {
        handles.inputPerson.onUpdate {
            val name = handles.inputPerson.fetch()?.name
            if (name != null) {
                handles.outputPerson.store(PurePerson_OutputPerson("Hello $name"))
            }
        }
    }
}
