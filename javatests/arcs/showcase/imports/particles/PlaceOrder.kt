package arcs.showcase.imports.particles

import kotlinx.coroutines.Job

class PlaceOrder : AbstractPlaceOrder() {
    override fun onReady() {
        handles.order.onUpdate { action ->
            val order = action.new
            val inventory = handles.inventory.fetchAll()
            val inStock = inventory
                .filter { order?.name == it.name }
                .filter { order?.variety == it.variety }
                .filter { order?.origin?.nation == it.origin.nation }

            val item = try {
                val item = inStock.first()
                handles.inventory.remove(item)
                val update = item.copy(weight = item.weight - order!!.amt)
                handles.inventory.store(update)
                orderPlaced.complete()
                item.copy(weight = order.amt)
            } catch (ex: IndexOutOfBoundsException) {
                Tea()
            } catch (ex: AssertionError) {
                Tea()
            }

            handles.toCustomer.store(item)
        }
    }

    companion object {
        val orderPlaced = Job()
    }
}
