@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.showcase.references

import arcs.core.entity.awaitReady;
import arcs.jvm.host.TargetHost
import kotlinx.coroutines.withContext

@TargetHost(ArcHost::class)
class Reader0 : AbstractReader0() {
    private suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
    }
    private fun Level0.fromArcs() = MyLevel0(name)

    suspend fun read(): List<MyLevel0> = withContext(handles.level0.dispatcher) {
        initialize()
        handles.level0.fetchAll().map { it.fromArcs() }
    }
}

@TargetHost(ArcHost::class)
class Reader1 : AbstractReader1() {
    private suspend fun initialize() = this.apply {
        handles.level1.awaitReady()
    }
    private fun Level0.fromArcs() = MyLevel0(name)

    private suspend fun Level1.fromArcs() = MyLevel1(
        name = name,
        children = children.map { it.dereference()!!.fromArcs() }.toSet()
    )

    suspend fun read(): List<MyLevel1> = withContext(handles.level1.dispatcher) {
        initialize()
        handles.level1.fetchAll().map { it.fromArcs() }
    }
}

@TargetHost(ArcHost::class)
class Reader2 : AbstractReader2() {
    private suspend fun initialize() = this.apply {
        handles.level2.awaitReady()
    }
    private fun Level0.fromArcs() = MyLevel0(name)

    private suspend fun Level1.fromArcs() = MyLevel1(
        name = name,
        children = children.map { it.dereference()!!.fromArcs() }.toSet()
    )

    private suspend fun Level2.fromArcs() = MyLevel2(
        name = name,
        children = children.map { it.dereference()!!.fromArcs() }.toSet()
    )

    suspend fun read(): List<MyLevel2> = withContext(handles.level2.dispatcher) {
        initialize()
        handles.level2.fetchAll().map { it.fromArcs() }
    }
}
