package arcs.showcase.typevariables

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job

class SkuRedactor : AbstractSkuRedactor() {
    override fun onStart() {
        handles.input.onUpdate {
            for (item in it.stream()) {
                assertThat(item.sku).isNotEmpty()
                handles.output.store(
                    item.copy(sku=item.sku.split("-").first() + "-*****")
                )
            }
        }
    }

    override fun onUpdate() {
        assertThat(handles.input.size()).isEqualTo(3)
        redacted.complete()
    }

    companion object {
        val redacted = Job()
    }
}
