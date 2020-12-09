package arcs.showcase.queries

import arcs.jvm.host.TargetHost

typealias Product = AbstractProductDatabase.Product

/**
 * This particle generates dummy data that is used in testing queries.
 * @see ProductClassifier
 */
@TargetHost(arcs.android.integration.IntegrationHost::class)
class ProductDatabase : AbstractProductDatabase() {
  override fun onFirstStart() {
    handles.products.storeAll(
      listOf(
        Product(name = "Pencil", price = 2.5),
        Product(name = "Ice cream", price = 3.0),
        Product(name = "Chocolate", price = 3.0),
        Product(name = "Blueberries", price = 4.0),
        Product(name = "Sandwich", price = 4.50),
        Product(name = "Scarf", price = 20.0),
        Product(name = "Hat", price = 25.0),
        Product(name = "Stop sign", price = 100.0)
      )
    )
  }
}
