@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.showcase.mappedread

import arcs.jvm.host.TargetHost
import arcs.showcase.ShowcaseHost
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

@ExperimentalCoroutinesApi
@TargetHost(ShowcaseHost::class)
class Writer : AbstractWriter() {
    private fun ClientItem.toArcs() = Item(txt, num.toDouble())

    suspend fun write(item: ClientItem) = withContext(handles.item.dispatcher) {
        handles.awaitReady()
        handles.item.store(item.toArcs())
    }
}
