package arcs.showcase.typevariables

import kotlinx.coroutines.Job

class SkuRedactor : AbstractSkuRedactor() {

    /** Redact each input sku, and store the results to the output handle. */
    override fun onReady() {
        require(handles.input.size() == 3)
        for (item in handles.input.fetchAll()) {
            require(item.sku.isNotEmpty())
            handles.output.store(item.copy(sku = redactSku(item.sku)))
        }
//        redacted.complete()
    }

    override fun onShutdown() {
        require(handles.output.size() == 3)
        redacted.complete()
    }

    private fun redactSku(sku: String) = sku.split('-').first() + "-*****"

    companion object {
        val redacted = Job()
    }
}
