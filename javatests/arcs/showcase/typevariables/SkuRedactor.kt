package arcs.showcase.typevariables

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job

class SkuRedactor : AbstractSkuRedactor() {

    /** Redact each input sku, and store the results to the output handle. */
    override fun onReady() {
        assertThat(handles.input.size()).isEqualTo(3)
        for (item in handles.input.fetchAll()) {
            require(item.sku.isNotEmpty())
            handles.output.store(item.copy(sku = redactSku(item.sku)))
        }
        redacted.complete()
    }

    private fun redactSku(sku: String) = sku.split('-').first() + "-*****"

    companion object {
        val redacted = Job()
    }
}
