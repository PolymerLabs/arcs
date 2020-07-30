package arcs.showcase.inlines

class ChildModifier : AbstractChildModifier() {

    override fun onUpdate() {
        val entity = requireNotNull(handles.child.fetch()) {
            "Failed to read entity from child handle!"
        }
        entity.mutate(trackingValue = "modified by ChildModifier")
        handles.child.store(entity)
    }
}
