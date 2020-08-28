package arcs.showcase.imports.particles

import arcs.sdk.combineUpdates

class ProduceInventory : AbstractProduceInventory() {
    override fun onReady() {
        combineUpdates(handles.minimum, handles.categorized) { min, labeled ->
            for ((qual, tea) in labeled) {
                if (qual.rating >= min!!.rating) {
                    handles.tea.store(tea)
                }
            }
        }
    }
}
