package arcs.showcase.imports.particles

import arcs.sdk.combineUpdates

class PlaceOrder : AbstractPlaceOrder() {
    override fun onReady() {
        handles.order.onUpdate { action ->
            val order = action.new
            val inventory = handles.inventory.fetchAll()
            val inStock = inventory
                .filter { order?.name == it.name }
                .filter { order?.variety == it.variety }
                .filter { order?.origin == it.origin }

            repeat(order?.amt?.toInt() ?: 1) {
                val item = try {
                    val item = inStock[it]
                    handles.inventory.remove(item)
                    item
                } catch (ex: IndexOutOfBoundsException) {
                    Tea()
                }

                handles.toCustomer.store(item)
            }
        }
    }
}

