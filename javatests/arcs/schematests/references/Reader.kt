@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.schematests.references

import arcs.core.entity.awaitReady;
import arcs.jvm.host.TargetHost
import kotlinx.coroutines.withContext

@TargetHost(ArcHost::class)
class Reader0 : AbstractReader0() {
    private suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
    }
    private fun Reader0_Level0.fromArcs() = Level0(name)

    suspend fun read(): List<Level0> = withContext(handles.level0.dispatcher) {
        initialize()
        handles.level0.fetchAll().map { it.fromArcs() }
    }
}

@TargetHost(ArcHost::class)
class Reader1 : AbstractReader1() {
    private suspend fun initialize() = this.apply {
        handles.level1.awaitReady()
    }
    private fun Reader1_Level1_Children.fromArcs() = Level0(name)

    private suspend fun Reader1_Level1.fromArcs(): Level1 {
        return Level1(
            name = name,
            children = children.map { it.dereference()!!.fromArcs() }.toSet()
        )
    }

    suspend fun read(): List<Level1> = withContext(handles.level1.dispatcher) {
        initialize()
        handles.level1.fetchAll().map { it.fromArcs() }
    }
}

@TargetHost(ArcHost::class)
class Reader2 : AbstractReader2() {
    private suspend fun initialize() = this.apply {
        handles.level2.awaitReady()
    }
    private fun Reader2_Level2_Children_Children.fromArcs() = Level0(name)

    private suspend fun Reader2_Level2_Children.fromArcs(): Level1 {
        return Level1(
            name = name,
            children = children.map { it.dereference()!!.fromArcs() }.toSet()
        )
    }

    private suspend fun Reader2_Level2.fromArcs(): Level2 {
        return Level2(
            name = name,
            children = children.map { it.dereference()!!.fromArcs() }.toSet()
        )
    }

    suspend fun read(): List<Level2> = withContext(handles.level2.dispatcher) {
        initialize()
        handles.level2.fetchAll().map { it.fromArcs() }
    }
}
