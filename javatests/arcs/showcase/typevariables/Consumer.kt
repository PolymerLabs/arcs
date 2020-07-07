package arcs.showcase.typevariables

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job

class Consumer : AbstractConsumer() {

    /** Process an order. In this case, we ensure that all items have been redacted. */
    override fun onUpdate() =
        handles.data.fetchAll()
            .also { it.size == 3 }
            .forEach {
                assertThat(it.sku).endsWith("*****")
                assertThat(it.name).isNotEmpty()
                // Ensure that we have the best prices while making *some* profit.
                assertThat(it.price).isAtLeast(0.25)
                assertThat(it.price).isAtMost(12.99)
            }
            .also { updated.complete() }


    companion object {
       val updated = Job()
    }
}
