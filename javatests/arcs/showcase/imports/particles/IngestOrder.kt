package arcs.showcase.imports.particles

class IngestOrder : AbstractIngestOrder() {
    override fun onFirstStart() {
        handles.order.store(
            Order(
                name = "Green Tea",
                variety = "Matcha",
                origin = Place("Japan"),
                amt = 50.0
            )
        )
    }
}

