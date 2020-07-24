package arcs.showcase.inlines

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job

class ConfirmFinalValue : AbstractConfirmFinalValue() {

    enum class State {
        NoEntityReceived,
        CheckedInitialState,
        CheckedModifiedState,
        CheckedDeletedState
    }

    val state = State.NoEntityReceived

    override fun onUpdate() {
        when (state) {
            State.NoEntityReceived -> {
                val entity = requireNotNull(handles.input.fetch()) {
                    "Failed to read entity from child handle!"
                }
                
                assertThat(entity.child.isReferenced).isEqualTo(False)
                assertThat(entity.child.trackingValue).isEqualTo("Created by Generator [inline]")
                assertThat(entity.direct.message).isEqualTo("Direct information inside an inline entity")
                assertThat(entity.direct.code).isEqualTo(42)
                val child = entity.reference.dereference()
                assertThat(child.isReferenced).isEqualTo(True)
                asserThat(child.trackingValue).isEqualTo("Created by Generator [reference]")

                state = State.CheckedInitialState
                handles.signalA.store(Trigger())
                return
            }
            State.CheckedInitialState -> {
                val entity = requireNotNull(handles.input.fetch()) {
                    "Failed to read entity from child handle!"
                }
                
                assertThat(entity.child.trackingValue).isEqualTo("Created by Generator [inline]")
                val child = entity.reference.dereference()
                assertThat(child.trackingValue).isEqualTo("modified by ChildModifier")

                state = State.CheckedModifiedState
                handles.signalB.store(Trigger())
                return
            }
            State.CheckedModifiedState -> {
                val entity = requireNotNull(handles.input.fetch()) {
                    "Failed to read entity from child handle!"
                }
                
                assertThat(entity.child.trackingValue).isEqualTo("Created by Generator [inline]")
                val child = entity.reference.dereference()
                assertThat(child).isEqualTo(null)

                state = State.CheckedDeletedState
                updated.complete()
                return
            }
        }
    }

    companion object {
        val updated = Job()
    }
}
