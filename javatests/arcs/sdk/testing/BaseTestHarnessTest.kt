package arcs.sdk.testing

import arcs.core.testutil.assertVariableOrdering
import arcs.core.testutil.handles.dispatchClear
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchIsEmpty
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchSize
import arcs.core.testutil.handles.dispatchStore
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
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
        // Verify that the effects of calling the harness handles are observable from the
        // particle handles.
        val harness = arcs.core.host.MultiHandleParticleTestHarness {
            arcs.core.host.MultiHandleParticle()
        }
        runTest(harness, "handleHelpers") {
            harness.start()

            // Singleton handles
            val particleData = harness.particle.handles.data

            harness.data.dispatchStore(arcs.core.host.MultiHandleParticle_Data(7.0))
            assertThat(particleData.dispatchFetch()?.num).isEqualTo(7.0)

            harness.data.dispatchClear()
            assertThat(particleData.dispatchFetch()).isNull()

            // Collection handles
            val particleList = harness.particle.handles.list
            val e1 = arcs.core.host.MultiHandleParticle_List("element1")
            val e2 = arcs.core.host.MultiHandleParticle_List("element2")
            val e3 = arcs.core.host.MultiHandleParticle_List("element3")

            harness.list.dispatchStore(e1, e2, e3)
            assertThat(particleList.dispatchSize()).isEqualTo(3)
            assertThat(particleList.dispatchIsEmpty()).isEqualTo(false)
            assertThat(particleList.dispatchFetchAll()).isEqualTo(setOf(e1, e2, e3))

            harness.list.dispatchRemove(e2)
            assertThat(particleList.dispatchSize()).isEqualTo(2)
            assertThat(particleList.dispatchIsEmpty()).isEqualTo(false)
            assertThat(particleList.dispatchFetchAll()).isEqualTo(setOf(e1, e3))

            harness.list.dispatchClear()
            assertThat(particleList.dispatchSize()).isEqualTo(0)
            assertThat(particleList.dispatchIsEmpty()).isEqualTo(true)
            assertThat(particleList.dispatchFetchAll()).isEmpty()
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

            harness.data.dispatchStore(arcs.core.host.SingleReadHandleParticle_Data(5.0))
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

            harness.data.dispatchStore(arcs.core.host.SingleWriteHandleParticle_Data(5.0))
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
            harness.data.dispatchStore(arcs.core.host.MultiHandleParticle_Data(3.2))
            harness.list.dispatchStore(arcs.core.host.MultiHandleParticle_List("hi"))
            harness.result.dispatchStore(arcs.core.host.MultiHandleParticle_Result(19.0))
            harness.config.dispatchStore(arcs.core.host.MultiHandleParticle_Config(true))
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
