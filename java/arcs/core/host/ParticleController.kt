package arcs.core.host

import arcs.core.host.api.Particle
import arcs.core.storage.api.Handle
import arcs.core.storage.api.ReadableHandle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Responsible for invoking the lifecycle methods of a [Particle], e.g. [Particle.onHandleUpdate].
 *
 * Create new instances via the [create] factory method.
 */
class ParticleController private constructor(
    private val particle: Particle,
    private val handles: Set<Handle>,
    private val scope: CoroutineScope
) {
    private val synced: MutableSet<Handle> = mutableSetOf()

    private val allSynced: Boolean
        get() = synced.size == handles.size

    /** Called once when the controller is created. See [create]. */
    private suspend fun registerListeners() {
        handles.forEach { handle ->
            handle.onSync { onSync(handle) }
            handle.onDesync { onDesync(handle) }
            if (handle is ReadableHandle<*>) {
                handle.onUpdate { onUpdate(handle) }
            }
        }
    }

    private fun onSync(handle: Handle) {
        checkValidHandle(handle)
        synced.add(handle)
        scope.launch {
            particle.onHandleSync(handle, allSynced)
        }
    }

    private fun onDesync(handle: Handle) {
        checkValidHandle(handle)
        synced.remove(handle)
    }

    private fun onUpdate(handle: Handle) {
        checkValidHandle(handle)
        scope.launch {
            particle.onHandleUpdate(handle)
        }
    }

    private fun checkValidHandle(handle: Handle) {
        if (handle !in handles) {
            throw IllegalStateException("Unexpected handle: ${handle.name}.")
        }
    }

    companion object {
        /** Factory method to construct new [ParticleController] instances. */
        suspend fun create(
            particle: Particle,
            handles: Set<Handle>,
            scope: CoroutineScope
        ) = ParticleController(particle, handles, scope).also {
            it.registerListeners()
        }
    }
}
