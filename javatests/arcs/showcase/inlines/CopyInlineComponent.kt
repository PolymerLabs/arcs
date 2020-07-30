package arcs.showcase.inlines

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking

class CopyInlineComponent : AbstractCopyInlineComponent() {
    override fun onUpdate() {
        val parent = requireNotNull(handles.input.fetch()) {
            "Failed to read entity from input handle!"
        }

        // This will create a copy of the entity because it's inlined
        handles.output.store(parent.child)
        updated.complete()    
    }

    companion object {
        val updated = Job()
    }
}