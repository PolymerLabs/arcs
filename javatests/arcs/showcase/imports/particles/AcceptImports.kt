package arcs.showcase.imports.particles

class AcceptImports : AbstractAcceptImports() {
    override fun onReady() {
        handles.boats.onUpdate { action ->
            for (boat in action.added) {
                for (container in boat.containers) {
                    handles.containers.store(container)
                }
            }
        }
    }
}

