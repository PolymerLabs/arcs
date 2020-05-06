@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.schematests

import arcs.core.entity.awaitReady
import arcs.jvm.host.TargetHost
import arcs.sdk.Reference
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
    // Due to note1 below, we now work with a different particle's type.
    private fun Writer2_Level1_Children.fromArcs() = Level0(name)

    private suspend fun Reader1_Level1.fromArcs() = Level1(
        name = name,
        // Note1:
        // Multiple types are created with the same schema hash.
        // The schema registry stores only 1 type per hash.
        // So the dereferencer will find the type associated with the hash, create it, and then
        // try to return it as the Reference type. This causes a class cast exception.
        // As a workaround, we can cast the Reference type to the type that actually made it into
        // the schema registry.
        children = children.map { (it as Reference<Writer2_Level1_Children>).dereference()!!.fromArcs() }.toSet()
    )

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
    // Due to note1 above, we now work with a different particle's type.
    private fun Writer2_Level2_Children_Children.fromArcs() = Level0(name)

    // Due to note1 above, we now work with a different particle's type.
    private suspend fun Writer2_Level2_Children.fromArcs() = Level1(
        name = name,
        children = children.map { it.dereference()!!.fromArcs() }.toSet()
    )

    private suspend fun Reader2_Level2.fromArcs() = Level2(
        name = name,
        // See Note1 above.
        children = children.map { (it as Reference<Writer2_Level2_Children>).dereference()!!.fromArcs() }.toSet()
    )

    suspend fun read(): List<Level2> = withContext(handles.level2.dispatcher) {
        initialize()
        handles.level2.fetchAll().map { it.fromArcs() }
    }
}
