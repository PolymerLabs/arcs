@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.schematests

import arcs.core.entity.awaitReady
import arcs.jvm.host.TargetHost
import arcs.sdk.Entity
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle
import arcs.sdk.Reference
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

suspend fun <T : Entity> T.toReference(handle: ReadWriteSingletonHandle<T>): Reference<T> {
    if (this@toReference.entityId == null) {
        handle.store(this@toReference)
    }
    return handle.createReference(this@toReference)
}

@TargetHost(ArcHost::class)
class Writer0 : AbstractWriter0() {
    private suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
    }
    private fun Level0.toArcs() = Writer0_Level0(name)

    suspend fun write(item: Level0) = withContext(handles.level0.dispatcher) {
        initialize()
        handles.level0.store(item.toArcs())
    }
}

@TargetHost(ArcHost::class)
class Writer1 : AbstractWriter1() {
    private suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
        handles.level1.awaitReady()
    }
    private fun Level0.toArcs() = Writer1_Level1_Children(name)

    private suspend fun Level1.toArcs() = Writer1_Level1(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level0) }.toSet()
    )
    suspend fun write(item: Level1) = withContext(handles.level1.dispatcher) {
        initialize()
        handles.level1.store(item.toArcs())
    }
}

@TargetHost(ArcHost::class)
class Writer2 : AbstractWriter2() {
    private suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
        handles.level1.awaitReady()
        handles.level2.awaitReady()
    }
    private fun Level0.toArcs() = Writer2_Level2_Children_Children(name)

    private suspend fun Level1.toArcs() = Writer2_Level2_Children(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level0) }.toSet()
    )

    private suspend fun Level2.toArcs() = Writer2_Level2(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level1) }.toSet()
    )

    suspend fun write(item: Level2) = withContext(handles.level2.dispatcher) {
        initialize()
        handles.level2.store(item.toArcs())
    }
}
