package arcs.showcase.imports.particles

import kotlinx.coroutines.Job

class PackageEgress : AbstractPackageEgress() {
    override fun onReady() {
        handles.toCustomer.onUpdate { action ->
            if (action.added.isNotEmpty()) {
                customerGotOrder.complete()
            }
        }
    }

    companion object {
        val customerGotOrder = Job()
    }
}
