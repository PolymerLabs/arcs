package arcs.core.host

import arcs.jvm.host.TargetHost
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
@TargetHost(TestingJvmProdHost::class)
class PurePerson : AbstractPurePerson() {
    override fun onStart() {
        handles.inputPerson.onUpdate {
            val name = handles.inputPerson.fetchZZ()?.name
            if (name != null) {
                handles.outputPerson.storeZZ(PurePerson_OutputPerson("Hello $name"))
            }
        }
    }
}
