@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.mappedread

import arcs.jvm.host.TargetHost
import arcs.showcase.ShowcaseHost
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

@ExperimentalCoroutinesApi
@TargetHost(ShowcaseHost::class)
class Reader : AbstractReader() {
    private fun Item.fromArcs() = ClientItem(txt, num.toInt())

    suspend fun read(): List<ClientItem> = withContext(handles.item.dispatcher) {
        handles.item.fetchAll().map { it.fromArcs() }
    }
}
