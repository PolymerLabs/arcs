package arcs.showcase.queries

import arcs.jvm.host.TargetHost

/**
 * This particle is an example of using handles with associated queries.
 * It performs three different queries which select products based on values provided at runtime:
 *  - an arbitrary double [CHEAP_PRICE]
 *  - an arbitrary double [EXPENSIVE_PRICE], and
 *  - an arbitrary string [SEARCH_NAME].
 *
 * It filters dummy data from [ProductDatabase], but could be used with any other source of data and
 * performs a simple labelling task showing how data can be combined from different handles without
 * loading the whole database into the Particle.
 */
@TargetHost(arcs.android.integration.IntegrationHost::class)
class ProductClassifier : AbstractProductClassifier() {

  override fun onReady() {
    // This map from product names to 'tags' accumulates the output that this particle provides.
    val productDescriptions = mutableMapOf<String, MutableSet<String>>()

    // Here, 'cheap' products are defined as products from the [cheapProducts] handle that have a
    // price less than or equal to [CHEAP_PRICE].
    // i.e. `price <= ?` see the definition in [queries.arcs]
    handles.cheapProducts.query(CHEAP_PRICE).forEach {
      productDescriptions.getOrPut(it.name) { mutableSetOf() }.add("cheap")
    }
    // Here, 'expensive' products are defined as products from the [expensiveProducts] handle that have a
    // price greater than or equal to [EXPENSIVE_PRICE].
    // i.e. `price >= ?` see the definition in [queries.arcs]
    handles.expensiveProducts.query(EXPENSIVE_PRICE).forEach {
      productDescriptions.getOrPut(it.name) { mutableSetOf() }.add("expensive")
    }
    // Here, 'named' products are defined as products from the [namedProducts] handle that have the
    // name equal to [SEARCH_NAME].
    // i.e. `name == ?` see the definition in [queries.arcs]
    handles.namedProducts.query(SEARCH_NAME).forEach {
      productDescriptions.getOrPut(it.name) { mutableSetOf() }.add("selected")
    }

    // This renders the 'tags' and product names as strings and stores them using the
    // [productDescriptions] handle.
    handles.productDescriptions.storeAll(
      productDescriptions.map { (name, tags) ->
        ProductDescription(description = "$name: ${tags.joinToString()}")
      }
    )
  }

  companion object {
    /**
     * These constants are arbitrary values to show that query arguments are provided at runtime.
     * They do not actually need to be constants and could be changed at runtime.
     */
    private const val CHEAP_PRICE = 3.0
    private const val EXPENSIVE_PRICE = 25.0
    private const val SEARCH_NAME = "Pencil"
  }
}
