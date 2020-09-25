package arcs.core.common

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Provides a counter with increment/decrement functionality whose value can be observed via a
 * Flow<Int>.
 *
 * The counter value will be conflated: if a large number of changes occur at once, collectors of
 * the flow may not receive all of them, but are guaranteed to receive the most recent one.
 */
@ExperimentalCoroutinesApi
class CounterFlow(initialValue: Int = 0) {
  private val stateFlow = MutableStateFlow(initialValue)

  /**
   * Returns a [Flow<Int>] that emits counter changes. Not every change is guaranteed to be emitted, but
   * you're always guaranteed to receive the last one.
   */
  val flow: Flow<Int> = stateFlow

  /**
   * Increments the counter. The change will be emitted on any active collections of [flow].
   */
  fun increment() {
    synchronized(stateFlow) {
      stateFlow.value++
    }
  }

  /**
   * Decrements the counter. The change will be emitted on any active collections of [flow].
   */
  fun decrement() {
    synchronized(stateFlow) {
      stateFlow.value--
    }
  }
}
