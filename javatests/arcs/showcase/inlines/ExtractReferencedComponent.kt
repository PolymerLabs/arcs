package arcs.showcase.inlines

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking

class ExtractReferencedComponent : AbstractExtractReferencedComponent() {
    override fun onUpdate() {
        val parent = requireNotNull(handles.input.fetch()) {
            "Failed to read entity from input handle!"
        }

        // This does not copy 
        val child = runBlocking() { parent.reference!!.dereference() }
        handles.output.store(child!!)
    }
}
