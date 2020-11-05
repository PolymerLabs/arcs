@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.inline

import arcs.jvm.host.TargetHost
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

@OptIn(ExperimentalCoroutinesApi::class)
@TargetHost(arcs.android.integration.IntegrationHost::class)
class Reader0 : AbstractReader0() {
  private fun Level0.fromArcs() = MyLevel0(name)

  suspend fun read(): List<MyLevel0> = withContext(handles.level0.dispatcher) {
    handles.level0.fetchAll().map { it.fromArcs() }
  }
}

@OptIn(ExperimentalCoroutinesApi::class)
@TargetHost(arcs.android.integration.IntegrationHost::class)
class Reader1 : AbstractReader1() {
  private fun Level0.fromArcs() = MyLevel0(name)

  private suspend fun Level1.fromArcs() = MyLevel1(
    name = name,
    children = children.map { it.fromArcs() }.toSet()
  )

  suspend fun read(): List<MyLevel1> = withContext(handles.level1.dispatcher) {
    handles.level1.fetchAll().map { it.fromArcs() }
  }
}

@OptIn(ExperimentalCoroutinesApi::class)
@TargetHost(arcs.android.integration.IntegrationHost::class)
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

  suspend fun read(): List<MyLevel2> = withContext(handles.level2.dispatcher) {
    handles.level2.fetchAll().map { it.fromArcs() }
  }
}
