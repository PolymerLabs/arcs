package arcs.showcase.typevariables

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job

class SkuRedactor : AbstractSkuRedactor() {

    /** Redact each input sku, and store the results to the output handle. */
    override fun onStart() {
        handles.input.onUpdate {
            for (item in it.stream()) {
                assertThat(item.sku).isNotEmpty()
                handles.output.store(item.copy(sku=redactSku(item.sku)))
            }
        }
    }

    private fun redactSku(sku: String): String = sku.split('-').first() + "-*****"

    override fun onUpdate() {
        assertThat(handles.input.size()).isEqualTo(3)
        redacted.complete()
    }

    companion object {
        val redacted = Job()
    }
}
