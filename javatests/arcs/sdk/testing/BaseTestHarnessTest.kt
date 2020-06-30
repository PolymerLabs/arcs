package arcs.sdk.testing

import arcs.core.testutil.assertVariableOrdering
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.junit.Test
import org.junit.runner.Description
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.junit.runners.model.Statement

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class BaseTestHarnessTest {
    @Test
    fun handleHelpers() {
        // Verify that the effects of calling BaseTestHarness's helper methods
        // on the harness handles are observable from the particle handles.
        val harness = arcs.core.host.MultiHandleParticleTestHarness {
            arcs.core.host.MultiHandleParticle()
        }
        runTest(harness, "handleHelpers") {
            harness.start()

            // Singleton handles
            val particleData = harness.particle.handles.data

            harness.store(harness.data, arcs.core.host.MultiHandleParticle_Data(7.0))
            assertThat(harness.fetch(harness.data)?.num).isEqualTo(7.0)
            withContext(particleData.dispatcher) {
                assertThat(particleData.fetch()?.num).isEqualTo(7.0)
            }

            harness.clear(harness.data)
            assertThat(harness.fetch(harness.data)).isNull()
            withContext(particleData.dispatcher) {
                assertThat(particleData.fetch()).isNull()
            }

            // Collection handles
            val particleList = harness.particle.handles.list
            val e1 = arcs.core.host.MultiHandleParticle_List("element1")
            val e2 = arcs.core.host.MultiHandleParticle_List("element2")
            val e3 = arcs.core.host.MultiHandleParticle_List("element3")
            val e4 = arcs.core.host.MultiHandleParticle_List("element4")

            harness.store(harness.list, e1)
            harness.store(harness.list, e2, e3)
            harness.remove(harness.list, e2)
            harness.store(harness.list, e4)
            harness.remove(harness.list, e4, e1)
            assertThat(harness.size(harness.list)).isEqualTo(1)
            assertThat(harness.isEmpty(harness.list)).isEqualTo(false)
            assertThat(harness.fetchAll(harness.list)).isEqualTo(setOf(e3))

            withContext(particleList.dispatcher) {
                assertThat(particleList.size()).isEqualTo(1)
                assertThat(particleList.isEmpty()).isEqualTo(false)
                assertThat(particleList.fetchAll()).isEqualTo(setOf(e3))
            }

            harness.clear(harness.list)
            assertThat(harness.size(harness.list)).isEqualTo(0)
            assertThat(harness.isEmpty(harness.list)).isEqualTo(true)
            assertThat(harness.fetchAll(harness.list)).isEmpty()

            withContext(particleList.dispatcher) {
                assertThat(particleList.size()).isEqualTo(0)
                assertThat(particleList.isEmpty()).isEqualTo(true)
                assertThat(particleList.fetchAll()).isEmpty()
            }
        }
    }

    @Test
    fun singleReadHandle() {
        val harness = arcs.core.host.SingleReadHandleParticleTestHarness {
            arcs.core.host.SingleReadHandleParticle()
        }
        runTest(harness, "singleReadHandle") {
            harness.start()
            assertThat(harness.particle.events)
                .isEqualTo(listOf("onFirstStart", "onStart", "data.onReady:null", "onReady:null"))
            harness.particle.events.clear()

            harness.store(harness.data, arcs.core.host.SingleReadHandleParticle_Data(5.0))
            assertThat(harness.particle.events)
                .isEqualTo(listOf("data.onUpdate:5.0", "onUpdate:5.0"))
        }
    }

    @Test
    fun singleWriteHandle() {
        val harness = arcs.core.host.SingleWriteHandleParticleTestHarness {
            arcs.core.host.SingleWriteHandleParticle()
        }
        runTest(harness, "singleWriteHandle") {
            harness.start()
            assertThat(harness.particle.events)
                .isEqualTo(listOf("onFirstStart", "onStart", "onReady"))
            harness.particle.events.clear()

            harness.store(harness.data, arcs.core.host.SingleWriteHandleParticle_Data(5.0))
            assertThat(harness.particle.events).isEmpty()
        }
    }

    @Test
    fun multiHandle() {
        val harness = arcs.core.host.MultiHandleParticleTestHarness {
            arcs.core.host.MultiHandleParticle()
        }

        runTest(harness, "multiHandle") {
            harness.start()
            harness.store(harness.data, arcs.core.host.MultiHandleParticle_Data(3.2))
            harness.store(harness.list, arcs.core.host.MultiHandleParticle_List("hi"))
            harness.store(harness.result, arcs.core.host.MultiHandleParticle_Result(19.0))
            harness.store(harness.config, arcs.core.host.MultiHandleParticle_Config(true))
            assertVariableOrdering(
                harness.particle.events,
                listOf("onFirstStart", "onStart"),
                // Handle onReady events are not guaranteed to be in any specific order.
                setOf("data.onReady:null", "list.onReady:[]", "config.onReady:null"),
                listOf(
                    "onReady:null:[]:null",
                    "data.onUpdate:3.2",
                    "onUpdate:3.2:[]:null",
                    "list.onUpdate:[hi]",
                    "onUpdate:3.2:[hi]:null",
                    "config.onUpdate:true",
                    "onUpdate:3.2:[hi]:true"
                )
            )
        }
    }

    // BaseTestHarness is set up as a TestRule. Using more than one harness as intended in the same
    // test class doesn't work: every rule is run for every test method, where we want each harness
    // to be pegged to one specific method. Thus we need to manually drive the harness class in the
    // same way that the @Rule invocation does.
    private fun runTest(harness: BaseTestHarness<*>, method: String, block: suspend () -> Unit) {
        val statement = object : Statement() {
            override fun evaluate() {
                runBlocking { block() }
            }
        }
        val description = Description.createTestDescription("BaseTestHarnessTest", method)
        harness.apply(statement, description).evaluate()
    }
}
