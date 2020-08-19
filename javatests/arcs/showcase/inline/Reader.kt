@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.inline

import arcs.jvm.host.TargetHost
import arcs.sdk.withParticleContext
import arcs.showcase.ShowcaseHost
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
@TargetHost(ShowcaseHost::class)
class Reader0 : AbstractReader0() {
    private fun Level0.fromArcs() = MyLevel0(name)

    suspend fun read(): List<MyLevel0> = withParticleContext {
        handles.awaitReady()
        handles.level0.fetchAll().map { it.fromArcs() }
    }
}

@ExperimentalCoroutinesApi
@TargetHost(ShowcaseHost::class)
class Reader1 : AbstractReader1() {
    private fun Level0.fromArcs() = MyLevel0(name)

    private fun Level1.fromArcs() = MyLevel1(
        name = name,
        children = children.map { it.fromArcs() }.toSet()
    )

    suspend fun read(): List<MyLevel1> = withParticleContext {
        handles.awaitReady()
        handles.level1.fetchAll().map { it.fromArcs() }
    }
}

@ExperimentalCoroutinesApi
@TargetHost(ShowcaseHost::class)
class Reader2 : AbstractReader2() {
    private fun Level0.fromArcs() = MyLevel0(name)

    private fun Level1.fromArcs() = MyLevel1(
        name = name,
        children = children.map { it.fromArcs() }.toSet()
    )

    private fun Level2.fromArcs() = MyLevel2(
        name = name,
        children = children.map { it.fromArcs() }.toSet()
    )

    suspend fun read(): List<MyLevel2> = withParticleContext {
        handles.awaitReady()
        handles.level2.fetchAll().map { it.fromArcs() }
    }
}
