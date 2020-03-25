package arcs.core.host

import arcs.jvm.host.TargetHost
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async

@TargetHost(TestingJvmProdHost::class)
class PurePerson : AbstractPurePerson() {
    override suspend fun onCreate() {
        handles.inputPerson.onUpdate {
            GlobalScope.async {
                val name = handles.inputPerson.fetch()?.name
                if (name != null) {
                    handles.outputPerson.store(PurePerson_OutputPerson("Hello $name"))
                }
            }
        }
    }
}
