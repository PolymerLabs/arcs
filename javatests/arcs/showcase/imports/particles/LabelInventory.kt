package arcs.showcase.imports.particles

import arcs.core.entity.Tuple2

class LabelInventory : AbstractLabelInventory() {
    override fun onReady() {
        handles.containers.onUpdate { action ->
            for (container in action.added) {
                for (tea in container.contents) {
                    handles.categorized.store(
                        Tuple2(Quality(rating = tea.name.hashCode() % 5 + 0.0), tea)
                    )
                }
            }
        }
    }
}

