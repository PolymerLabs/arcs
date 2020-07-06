package arcs.showcase.typevariables

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job

class Consumer : AbstractConsumer() {
    /** Assert that all items in the collection have been redacted. */
    override fun onUpdate() =
        handles.data.fetchAll()
            .also { it.size == 3 }
            .forEach {
                assertThat(it.sku).endsWith("*****")
                assertThat(it.name).isNotEmpty()
                assertThat(it.price).isAtLeast(0.25)
            }
            .also { updated.complete() }


    companion object {
       val updated = Job()
    }
}
