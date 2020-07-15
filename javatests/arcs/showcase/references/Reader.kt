@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.references

import arcs.jvm.host.TargetHost
import arcs.sdk.Entity
import arcs.sdk.ReadCollectionHandle
import arcs.sdk.Reference
import arcs.showcase.ShowcaseHost
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

fun <T : Entity> Reference<T>.dereferenceViaHandle(handle: ReadCollectionHandle<T>): T? {
    return handle.fetchAll().firstOrNull { it.entityId == entityId }
}

@ExperimentalCoroutinesApi
@TargetHost(ShowcaseHost::class)
class Reader0 : AbstractReader0() {
    private fun Level0.fromArcs() = MyLevel0(name)

    suspend fun read(): List<MyLevel0> = withContext(handles.level0.dispatcher) {
        handles.awaitReady()
        handles.level0.fetchAll().map { it.fromArcs() }
    }
}

@ExperimentalCoroutinesApi
@TargetHost(ShowcaseHost::class)
class Reader1 : AbstractReader1() {
    private fun Level0.fromArcs() = MyLevel0(name)

    private suspend fun Level1.fromArcs() = MyLevel1(
        name = name,
        children = children.map { it.dereferenceViaHandle(handles.level0)!!.fromArcs() }.toSet()
    )

    suspend fun read(): List<MyLevel1> = withContext(handles.level1.dispatcher) {
        handles.awaitReady()
        handles.level1.fetchAll().map { it.fromArcs() }
    }
}

@ExperimentalCoroutinesApi
@TargetHost(ShowcaseHost::class)
class Reader2 : AbstractReader2() {
    private fun Level0.fromArcs() = MyLevel0(name)

    private suspend fun Level1.fromArcs() = MyLevel1(
        name = name,
        children = children.map { it.dereferenceViaHandle(handles.level0)!!.fromArcs() }.toSet()
    )

    private suspend fun Level2.fromArcs() = MyLevel2(
        name = name,
        children = children.map { it.dereferenceViaHandle(handles.level1)!!.fromArcs() }.toSet()
    )

    suspend fun read(): List<MyLevel2> = withContext(handles.level2.dispatcher) {
        handles.awaitReady()
        handles.level2.fetchAll().map { it.fromArcs() }
    }
}
