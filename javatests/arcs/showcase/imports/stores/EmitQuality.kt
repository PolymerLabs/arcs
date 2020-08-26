package arcs.showcase.imports.stores

import kotlinx.coroutines.Job

class EmitQuality : AbstractIngestQuality() {
    override fun onFirstStart() {
        handles.minimum.store(Quality(rating = 2.5))
        qualityStandardSet.complete()
    }

    companion object {
        val qualityStandardSet = Job()
    }
}
