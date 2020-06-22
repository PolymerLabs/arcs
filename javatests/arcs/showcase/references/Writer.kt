@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.showcase.references

import arcs.core.entity.awaitReady
import arcs.jvm.host.TargetHost
import arcs.sdk.Entity
import arcs.sdk.ReadWriteSingletonHandle
import arcs.sdk.Reference
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

suspend fun <T : Entity> T.toReference(handle: ReadWriteSingletonHandle<T>): Reference<T> {
    if (this@toReference.entityId == null) {
        handle.store(this@toReference)
    }
    return handle.createReference(this@toReference)
}

@ExperimentalCoroutinesApi
@TargetHost(ArcHost::class)
class Writer0 : AbstractWriter0() {
    private suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
    }
    private fun MyLevel0.toArcs() = Level0(name)

    suspend fun write(item: MyLevel0) = withContext(handles.level0.dispatcher) {
        initialize()
        handles.level0.store(item.toArcs())
    }
}

@ExperimentalCoroutinesApi
@TargetHost(ArcHost::class)
class Writer1 : AbstractWriter1() {
    private suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
        handles.level1.awaitReady()
    }
    private fun MyLevel0.toArcs() = Level0(name)

    private suspend fun MyLevel1.toArcs() = Level1(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level0) }.toSet()
    )
    suspend fun write(item: MyLevel1) = withContext(handles.level1.dispatcher) {
        initialize()
        handles.level1.store(item.toArcs())
    }
}

@ExperimentalCoroutinesApi
@TargetHost(ArcHost::class)
class Writer2 : AbstractWriter2() {
    private suspend fun initialize() = this.apply {
        handles.level0.awaitReady()
        handles.level1.awaitReady()
        handles.level2.awaitReady()
    }
    private fun MyLevel0.toArcs() = Level0(name)

    private suspend fun MyLevel1.toArcs() = Level1(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level0) }.toSet()
    )

    private suspend fun MyLevel2.toArcs() = Level2(
        name = name,
        children = children.map { it.toArcs().toReference(handles.level1) }.toSet()
    )

    suspend fun write(item: MyLevel2) = withContext(handles.level2.dispatcher) {
        initialize()
        handles.level2.store(item.toArcs())
    }
}
