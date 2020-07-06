package arcs.showcase.typevariables

class SkuRedactor : AbstractSkuRedactor() {
    override fun onStart() {
        handles.input.onUpdate {
            for (item in it.stream()) {
                handles.output.store(
                    item.copy(sku=item.sku.split("-").first() + "-*****")
                )
            }
        }
    }
}
