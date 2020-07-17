package arcs.showcase.joins

import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.JoinStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class JoinPlanTest {
    @Test
    fun canParseJoinStorageKey() {
        DriverAndKeyConfigurator.configure(null)
        val particle = ReadJoinPlan.particles.single()
        val connection = particle.handles.values.single()

        assertThat(connection.storageKey).isInstanceOf(JoinStorageKey::class.java)
        val storageKey = connection.storageKey as JoinStorageKey

        assertThat(storageKey.components).hasSize(3)
        assertThat(storageKey.components[0]).isInstanceOf(ReferenceModeStorageKey::class.java)
    }
}
