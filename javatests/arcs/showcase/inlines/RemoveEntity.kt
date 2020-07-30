package arcs.showcase.inlines

class RemoveEntity : AbstractRemoveEntity() {

    override fun onUpdate() {
        val entity = requireNotNull(handles.thingToRemove.fetch()) {
            "Failed to read entity from thingToRemove handle!"
        }
        handles.collectionToRemoveItWith.store(entity)
        handles.collectionToRemoveItWith.remove(entity)
    }
}
