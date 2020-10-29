@file:Suppress("EXPERIMENTAL_FEATURE_WARNING")

package arcs.showcase.inline

import arcs.jvm.host.TargetHost
import arcs.showcase.ShowcaseHost
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

@OptIn(ExperimentalCoroutinesApi::class)
@TargetHost(ShowcaseHost::class)
class Writer0 : AbstractWriter0() {
  private fun MyLevel0.toArcs() = Level0(name)

  suspend fun write(item: MyLevel0) = withContext(handles.level0.dispatcher) {
    handles.level0.store(item.toArcs())
  }
}

@OptIn(ExperimentalCoroutinesApi::class)
@TargetHost(ShowcaseHost::class)
class Writer1 : AbstractWriter1() {
  private fun MyLevel0.toArcs() = Level0(name)

  private suspend fun MyLevel1.toArcs() = Level1(
    name = name,
    children = children.map { it.toArcs() }.toSet()
  )

  suspend fun write(item: MyLevel1) = withContext(handles.level1.dispatcher) {
    handles.level1.store(item.toArcs())
  }
}

@OptIn(ExperimentalCoroutinesApi::class)
@TargetHost(ShowcaseHost::class)
class Writer2 : AbstractWriter2() {
  private fun MyLevel0.toArcs() = Level0(name)

  private suspend fun MyLevel1.toArcs() = Level1(
    name = name,
    children = children.map { it.toArcs() }.toSet()
  )

  private suspend fun MyLevel2.toArcs() = Level2(
    name = name,
    children = children.map { it.toArcs() }.toSet()
  )

  suspend fun write(item: MyLevel2) = withContext(handles.level2.dispatcher) {
    handles.level2.store(item.toArcs())
  }
}
