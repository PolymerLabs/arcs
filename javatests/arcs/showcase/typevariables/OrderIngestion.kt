package arcs.showcase.typevariables

class OrderIngestion : AbstractOrderIngestion() {
    override fun onReady() {
        handles.data.store(
            Product(
                sku="FN-9330",
                name="Wooden Muddler",
                price=1.49
            )
        )
        handles.data.store(
            Product(
                sku="FN-2187",
                name="Cylindrical Ice Cubes Mold",
                price=7.49
            )
        )
        handles.data.store(
            Product(
                sku="TK-421",
                name="Organic Mint",
                price=2.49
            )
        )
    }
}
