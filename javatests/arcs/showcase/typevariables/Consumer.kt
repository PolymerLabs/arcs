package arcs.showcase.typevariables

import com.google.common.truth.Truth.assertThat

class Consumer : AbstractConsumer() {
    // Assert that all items in the collection have been redacted.
    override fun onUpdate() =
        handles.data.fetchAll().forEach { assertThat(it.sku).endsWith("*****") }

}
