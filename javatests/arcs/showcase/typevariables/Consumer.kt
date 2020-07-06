package arcs.showcase.typevariables

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job

class Consumer : AbstractConsumer() {
    // Assert that all items in the collection have been redacted.
    override fun onUpdate() =
        handles.data.fetchAll()
            .forEach { assertThat(it.sku).endsWith("*****") }
            .also { updated.complete() }


    companion object {
       val updated = Job()
    }
}
