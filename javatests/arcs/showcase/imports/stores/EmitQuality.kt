package arcs.showcase.imports.stores

class EmitQuality : AbstractIngestQuality() {
    override fun onFirstStart() {
        handles.minimum.store(Quality(rating = 4.6))
    }
}
