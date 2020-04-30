@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.schematests

import arcs.core.entity.awaitReady
import arcs.jvm.host.TargetHost
import arcs.sdk.Entity
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.Reference
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext

fun <T : Entity> T.toReference(handle: ReadWriteCollectionHandle<T>): Reference<T> = runBlocking {
    if (this@toReference.entityId == null) {
        handle.store(this@toReference)
    }
    handle.createReference(this@toReference)
}

@TargetHost(ArcHost::class)
class Writer0 : AbstractWriter0() {
    suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
    }
    private fun Level0.toArcs() = Writer0_Level0(name)

    suspend fun write(item: Level0) = withContext(handles.level0.dispatcher) {
        handles.level0.store(item.toArcs())
    }
}

@TargetHost(ArcHost::class)
class Writer1 : AbstractWriter1() {
    suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
        handles.level1.awaitReady()
    }
    private fun Level0.toArcs() = Writer1_Level1_Children(name)

    private fun Level1.toArcs() = Writer1_Level1(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level0) }.toSet()
    )
    suspend fun write(item: Level1) = withContext(handles.level1.dispatcher) {
        handles.level1.store(item.toArcs())
    }
}

@TargetHost(ArcHost::class)
class Writer2 : AbstractWriter2() {
    suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
        handles.level1.awaitReady()
        handles.level2.awaitReady()
    }
    private fun Level0.toArcs() = Writer2_Level2_Children_Children(name)

    private fun Level1.toArcs() = Writer2_Level2_Children(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level0) }.toSet()
    )

    private fun Level2.toArcs() = Writer2_Level2(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level1) }.toSet()
    )

    suspend fun write(item: Level2) = withContext(handles.level2.dispatcher) {
        handles.level2.store(item.toArcs())
    }
}
