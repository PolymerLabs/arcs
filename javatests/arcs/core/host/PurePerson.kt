package arcs.core.host

import arcs.jvm.host.TargetHost
import arcs.sdk.Particle
import com.google.auto.service.AutoService
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async

@AutoService(Particle::class)
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
