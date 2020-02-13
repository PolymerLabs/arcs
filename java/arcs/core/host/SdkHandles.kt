package arcs.core.host

import arcs.core.data.RawEntity
import arcs.core.storage.Callbacks
import arcs.core.storage.handle.CollectionImpl
import arcs.core.storage.handle.SingletonHandle
import arcs.core.storage.handle.SingletonOp
import arcs.sdk.Entity
import arcs.sdk.JvmEntity
import arcs.sdk.Particle
import arcs.sdk.ReadableCollection
import arcs.sdk.ReadableSingleton
import arcs.sdk.WritableCollection
import arcs.sdk.WritableSingleton
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

internal open class ReadableSingletonHandleImpl<T : Entity>(
    val particle: Particle,
    val handleName: String,
    val storageHandle: SingletonHandle<RawEntity>
) : ReadableSingleton<T> {
    var updateCallback: ((T?) -> Unit)? = null

    init {
        storageHandle.callback = object : Callbacks<SingletonOp<RawEntity>> {
            override fun onUpdate(op: SingletonOp<RawEntity>) {
                GlobalScope.launch {
                    updateCallback?.invoke(fetch())
                    particle.onHandleUpdate(this@ReadableSingletonHandleImpl)
                }
            }

            override fun onSync() {
                GlobalScope.launch {
                    particle.onHandleSync(this@ReadableSingletonHandleImpl, true)
                }
            }

            override fun onDesync() {
                particle.onHandleSync(this@ReadableSingletonHandleImpl, true)
            }

        }
    }

    override val name: String
        get() = handleName

    override suspend fun fetch(): T? =
        storageHandle.fetch()?.let { rawEntity ->
            particle.handles.entitySpecs[handleName]?.deserialize(
                rawEntity.toMap()
            )
        } as? T

    override suspend fun onUpdate(action: (T?) -> Unit) {
        updateCallback = action
    }
}

internal class WritableSingletonHandleImpl<T : Entity>(
    val particle: Particle,
    val handleName: String,
    val storageHandle: SingletonHandle<RawEntity>
) : WritableSingleton<T> {
    override val name: String
        get() = handleName

    override suspend fun set(entity: T) {
        storageHandle.set((entity as JvmEntity).serialize())
    }

    override suspend fun clear() =
        storageHandle.clear()
}

internal class ReadWriteSingletonHandleImpl<T : Entity>(
    particle: Particle,
    handleName: String,
    storageHandle: SingletonHandle<RawEntity>,
    private val writableSingleton: WritableSingletonHandleImpl<T> = WritableSingletonHandleImpl(
        particle,
        handleName,
        storageHandle
    )
) : ReadableSingletonHandleImpl<T>(particle, handleName, storageHandle),
    WritableSingleton<T> by writableSingleton {
    override val name: String
        get() = writableSingleton.name
}

internal open class ReadableCollectionHandleImpl<T : Entity>(
    val particle: Particle,
    val handleName: String,
    val storageHandle: CollectionImpl<RawEntity>
) : ReadableCollection<T> {
    var updateCallback: ((Set<T>) -> Unit)? = null
    // todo: implement onUpdate callbacks

    override val name: String
        get() = handleName


    override fun onUpdate(action: (Set<T>) -> Unit) {
        updateCallback = action
    }

    override val size: Int
        get() = TODO("Not yet implemented")

    override fun isEmpty() = fetchAll().isEmpty()

    override fun fetchAll(): Set<T> {
        TODO("Not yet implemented")
    }
}

internal class WritableCollectionHandleImpl<T : Entity>(
    val particle: Particle,
    val handleName: String,
    val storageHandle: CollectionImpl<RawEntity>
) : WritableCollection<T> {
    override val name: String
        get() = handleName

    override fun store(entity: T) {
        TODO("Not yet implemented")
    }

    override fun clear() {
        TODO("Not yet implemented")
    }

    override fun remove(entity: T) {
        TODO("Not yet implemented")
    }
}

internal class ReadWriteCollectionHandleImpl<T : Entity>(
    particle: Particle,
    handleName: String,
    storageHandle: CollectionImpl<RawEntity>,
    private val writableCollection: WritableCollectionHandleImpl<T> = WritableCollectionHandleImpl(
        particle,
        handleName,
        storageHandle
    )
) : ReadableCollectionHandleImpl<T>(particle, handleName, storageHandle),
    WritableCollection<T> by writableCollection {
    override val name: String
        get() = writableCollection.name
}
