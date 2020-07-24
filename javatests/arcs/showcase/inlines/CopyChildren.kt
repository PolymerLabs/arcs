package arcs.showcase.inlines

import com.google.common.truth.Truth.assertThat

class CopyInlineComponent : AbstractCopyInlineComponent() {
    override fun onUpdate() {
        val parent = requireNotNull(handles.input.fetch()) {
            "Failed to read entity from input handle!"
        }

        // This will create a copy of the entity because it's inlined
        handles.output.store(parent.child)
    }
}

class ExtractReferencedComponent : AbstractExtractReferencedComponent() {
    override fun onUpdate() {
        val parent = requireNotNull(handles.input.fetch()) {
            "Failed to read entity from input handle!"
        }

        // This does not copy 
        handles.output.store(parent.reference.dereference())
    }
}
