package arcs.sdk.testing

import arcs.sdk.BaseParticle
import arcs.sdk.Entity
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle

/**
 * Self containing implementation of [ReadWriteCollectionHandle] to be used in Unit Tests.
 */
class TestingCollection<T : Entity>(
    val particle: BaseParticle,
    override val name: String,
    initialState: Set<T> = setOf()
) : ReadWriteCollectionHandle<T> {

    private val entities: MutableSet<T> = mutableSetOf()
    private var synced = false
    private val updateCallbacks: MutableList<(Set<T>) -> Unit> = mutableListOf()
    private val syncCallbacks: MutableList<() -> Unit> = mutableListOf()
    private val desyncCallbacks: MutableList<() -> Unit> = mutableListOf()

    init {
        particle.handles.setHandle(name, this)
        sync(initialState)
    }

    override suspend fun size() = entities.size
    override suspend fun isEmpty() = entities.isEmpty()
    override suspend fun fetchAll() = entities

    override suspend fun store(entity: T) {
        entities.add(entity)
        notifyUpdates()
    }

    override suspend fun clear() {
        entities.clear()
        notifyUpdates()
    }

    override suspend fun remove(entity: T) {
        entities.remove(entity)
        notifyUpdates()
    }

    override suspend fun onUpdate(action: (Set<T>) -> Unit) { updateCallbacks.add(action) }
    override suspend fun onSync(action: () -> Unit) { syncCallbacks.add(action) }
    override suspend fun onDesync(action: () -> Unit) { desyncCallbacks.add(action) }

    fun sync(initialState: Set<T> = setOf()) {
        assert(!synced)
        synced = true

        entities.clear()
        entities.addAll(initialState)

        syncCallbacks.forEach { it() }
    }

    fun desync() {
        assert(synced)
        synced = false
    }

    private suspend fun notifyUpdates() {
        if (synced) {
            particle.onHandleUpdate(this)
            updateCallbacks.forEach { it(entities) }
        }
    }
}

/**
 * Self containing implementation of [ReadWriteSingletonHandle] to be used in Unit Tests.
 */
class TestingSingleton<T : Entity>(
    val particle: BaseParticle,
    override val name: String,
    initialState: T? = null
) : ReadWriteSingletonHandle<T> {

    private var entity: T? = null
    private var synced = false
    private val updateCallbacks: MutableList<(T?) -> Unit> = mutableListOf()
    private val syncCallbacks: MutableList<() -> Unit> = mutableListOf()
    private val desyncCallbacks: MutableList<() -> Unit> = mutableListOf()

    init {
        particle.handles.setHandle(name, this)
        sync(initialState)
    }

    override suspend fun fetch() = entity

    override suspend fun store(entity: T) {
        this.entity = entity
        notifyUpdates()
    }

    override suspend fun clear() {
        entity = null
        notifyUpdates()
    }

    override suspend fun onUpdate(action: (T?) -> Unit) { updateCallbacks.add(action) }
    override suspend fun onSync(action: () -> Unit) { syncCallbacks.add(action) }
    override suspend fun onDesync(action: () -> Unit) { desyncCallbacks.add(action) }

    fun sync(initialState: T? = null) {
        assert(!synced)
        synced = true

        entity = initialState

        syncCallbacks.forEach { it() }
    }

    fun desync() {
        assert(synced)
        synced = false

        desyncCallbacks.forEach { it() }
    }

    private suspend fun notifyUpdates() {
        if (synced) {
            particle.onHandleUpdate(this)
            updateCallbacks.forEach { it(entity) }
        }
    }
}
