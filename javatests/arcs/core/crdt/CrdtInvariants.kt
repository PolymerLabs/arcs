package arcs.core.crdt

import com.google.common.truth.Truth

fun <T : CrdtData, U : CrdtOperation, V> invariant_mergeWithSelf_producesNoChanges(
  model: CrdtModel<T, U, V>
) {
  val changes = model.merge(model.data)
  Truth.assertThat(changes.modelChange.isEmpty()).isTrue()
  Truth.assertThat(changes.otherChange.isEmpty()).isTrue()
}
