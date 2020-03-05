package arcs.core.host

import arcs.core.common.Id
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.storage.Callbacks
import arcs.core.storage.Handle as StorageHandle
import arcs.core.storage.StorageKey
import arcs.core.storage.api.Entity
import arcs.core.storage.api.EntitySpec
import arcs.core.storage.api.Handle
import arcs.core.storage.api.ReadCollectionHandle
import arcs.core.storage.api.ReadSingletonHandle
import arcs.core.storage.api.ReadWriteCollectionHandle
import arcs.core.storage.api.ReadWriteSingletonHandle
import arcs.core.storage.api.WriteCollectionHandle
import arcs.core.storage.api.WriteSingletonHandle
import arcs.core.storage.handle.CollectionImpl
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SetData
import arcs.core.storage.handle.SetHandle
import arcs.core.storage.handle.SetOp
import arcs.core.storage.handle.SingletonData
import arcs.core.storage.handle.SingletonHandle
import arcs.core.storage.handle.SingletonOp
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

typealias Sender = (block: suspend () -> Unit) -> Unit
typealias SingletonSenderCallbackAdapter<E> =
    SenderCallbackAdapter<SingletonData<RawEntity>, SingletonOp<RawEntity>, RawEntity?, E?>
typealias CollectionSenderCallbackAdapter<E> =
    SenderCallbackAdapter<SetData<RawEntity>, SetOp<RawEntity>, Set<RawEntity>, E>

/**
 * Wraps a [HandleManager] and creates [Entity] handles based on [HandleMode], such as
 * [ReadSingletonHandle] for [HandleMode.Read]. To obtain a [HandleHolder], use
 * `arcs_kt_schema` on a manifest file to generate a `{ParticleName}Handles' class, and
 * invoke its default constructor, or obtain it from the [BaseParticle.handles] field.
 *
 * TODO(cromwellian): Add support for creating Singleton/Set handles of [Reference]s.
 */
class EntityHandleManager(private val handleManager: HandleManager) {

    /**
     * Creates and returns a new [SingletonHandle] for managing an [Entity].
     *
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun <T : Entity> createSingletonHandle(
        entitySpec: EntitySpec<T>,
        handleName: String,
        storageKey: StorageKey,
        schema: Schema,
        handleMode: HandleMode = HandleMode.ReadWrite,
        idGenerator: Id.Generator = Id.Generator.newSession(),
        sender: Sender = ::defaultSender
    ): Handle {
        val storageHandle = handleManager.singletonHandle(
            storageKey,
            schema,
            canRead = handleMode != HandleMode.Write
        )
        return when (handleMode) {
            HandleMode.ReadWrite -> ReadWriteSingletonHandleImpl(
                entitySpec,
                handleName,
                storageHandle,
                idGenerator,
                sender
            )
            HandleMode.Read -> ReadSingletonHandleImpl(
                entitySpec,
                handleName,
                storageHandle,
                sender
            )
            HandleMode.Write -> WriteSingletonHandleImpl<T>(
                handleName,
                storageHandle,
                idGenerator
            )
        }
    }

    /**
     * Creates and returns a new [SetHandle] for a set of [Entity]s.
     *
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun <T : Entity> createSetHandle(
        entitySpec: EntitySpec<T>,
        handleName: String,
        storageKey: StorageKey,
        schema: Schema,
        handleMode: HandleMode = HandleMode.ReadWrite,
        idGenerator: Id.Generator = Id.Generator.newSession(),
        sender: Sender = ::defaultSender
    ): Handle {
        val storageHandle = handleManager.setHandle(
            storageKey,
            schema,
            canRead = handleMode != HandleMode.Write
        )
        return when (handleMode) {
            HandleMode.ReadWrite -> ReadWriteCollectionHandleImpl(
                entitySpec,
                handleName,
                storageHandle,
                idGenerator,
                sender
            )
            HandleMode.Read -> ReadCollectionHandleImpl(
                entitySpec,
                handleName,
                storageHandle,
                sender
            )
            HandleMode.Write -> WriteCollectionHandleImpl<T>(
                handleName,
                storageHandle,
                idGenerator
            )
        }
    }

    /**
     * Same-thread non-blocking dispatch. Note that this may lead to concurrency problems on
     * some platforms. On platforms with real preemptive threads, use an implementation that
     * provides concurrency aware dispatch.
     */
    private fun defaultSender(block: suspend () -> Unit) {
        GlobalScope.launch {
            block()
        }
    }
}

internal open class HandleEventBase<T, H : Handle> {
    protected val onUpdateActions: MutableList<(T) -> Unit> = mutableListOf()
    protected val onSyncActions: MutableList<(H) -> Unit> = mutableListOf()
    protected val onDesyncActions: MutableList<(H) -> Unit> = mutableListOf()

    suspend fun onUpdate(action: (T) -> Unit) {
        onUpdateActions.add(action)
    }

    suspend fun onSync(action: (H) -> Unit) {
        onSyncActions.add(action)
    }

    suspend fun onDesync(action: (H) -> Unit) {
        onDesyncActions.add(action)
    }

    protected suspend fun fireUpdate(value: T) {
        onUpdateActions.forEach { action -> action(value) }
    }

    protected suspend fun fireSync() {
        onSyncActions.forEach { action -> action(this as H) }
    }

    protected suspend fun fireDesync() {
        onDesyncActions.forEach { action -> action(this as H) }
    }
}

internal open class ReadSingletonHandleImpl<T : Entity>(
    val entitySpec: EntitySpec<T>,
    val handleName: String,
    val storageHandle: SingletonHandle<RawEntity>,
    sender: Sender
) : HandleEventBase<T?, ReadSingletonHandle<T>>(), ReadSingletonHandle<T> {
    init {
        storageHandle.callback = SingletonSenderCallbackAdapter(
            this::fetch,
            this::fireUpdate,
            this::fireSync,
            this::fireDesync,
            sender
        )
    }

    override val name: String
        get() = handleName

    override suspend fun fetch(): T? = storageHandle.fetch()?.let {
        rawEntity -> entitySpec.deserialize(rawEntity)
    }
}

internal class WriteSingletonHandleImpl<T : Entity>(
    val handleName: String,
    private val storageHandle: SingletonHandle<RawEntity>,
    private val idGenerator: Id.Generator
) : WriteSingletonHandle<T> {
    override val name: String
        get() = handleName

    override suspend fun store(entity: T) {
        storageHandle.store(
            entity.ensureIdentified(idGenerator, handleName).serialize()
        )
    }

    override suspend fun clear() {
        storageHandle.clear()
    }
}

internal class ReadWriteSingletonHandleImpl<T : Entity>(
    entitySpec: EntitySpec<T>,
    handleName: String,
    storageHandle: SingletonHandle<RawEntity>,
    idGenerator: Id.Generator,
    sender: Sender,
    private val writableSingleton: WriteSingletonHandleImpl<T> = WriteSingletonHandleImpl(
        handleName,
        storageHandle,
        idGenerator
    )
) : ReadWriteSingletonHandle<T>,
    ReadSingletonHandleImpl<T>(entitySpec, handleName, storageHandle, sender),
    WriteSingletonHandle<T> by writableSingleton {
    override val name: String
        get() = writableSingleton.name
}

internal open class ReadCollectionHandleImpl<T : Entity>(
    private val entitySpec: EntitySpec<T>,
    val handleName: String,
    private val storageHandle: SetHandle<RawEntity>,
    sender: Sender
) : HandleEventBase<Set<T>, ReadCollectionHandle<T>>(), ReadCollectionHandle<T> {
    init {
        storageHandle.callback = CollectionSenderCallbackAdapter(
            this::fetchAll,
            this::fireUpdate,
            this::fireSync,
            this::fireDesync,
            sender
        )
    }

    override val name: String
        get() = handleName

    override suspend fun size(): Int = fetchAll().size

    override suspend fun isEmpty() = fetchAll().isEmpty()

    override suspend fun fetchAll(): Set<T> = storageHandle.fetchAll().map {
        entitySpec.deserialize(it)
    }.toSet()
}

internal class WriteCollectionHandleImpl<T : Entity>(
    val handleName: String,
    private val storageHandle: CollectionImpl<RawEntity>,
    private val idGenerator: Id.Generator
) : WriteCollectionHandle<T> {
    override val name: String
        get() = handleName

    override suspend fun store(entity: T) {
        storageHandle.store(
            entity.ensureIdentified(idGenerator, handleName).serialize()
        )
    }

    override suspend fun clear() {
        storageHandle.clear()
    }

    override suspend fun remove(entity: T) {
        storageHandle.remove(entity.serialize())
    }
}

internal class ReadWriteCollectionHandleImpl<T : Entity>(
    entitySpec: EntitySpec<T>,
    handleName: String,
    storageHandle: CollectionImpl<RawEntity>,
    idGenerator: Id.Generator,
    sender: Sender,
    private val writableCollection: WriteCollectionHandleImpl<T> = WriteCollectionHandleImpl(
        handleName,
        storageHandle,
        idGenerator
    )
) : ReadWriteCollectionHandle<T>,
    ReadCollectionHandleImpl<T>(entitySpec, handleName, storageHandle, sender),
    WriteCollectionHandle<T> by writableCollection {
    override val name: String
        get() = writableCollection.name
}

/**
 * Adapts [StorageHandle] [Callbacks] events into SDK callbacks. All events are dispatched
 * via a [Sender], which can enforce appropriate levels of concurrency.
 */
class SenderCallbackAdapter<Data : CrdtData, Op : CrdtOperationAtTime, T, E>(
    private val fetchFunc: suspend () -> E,
    private val updateCallback: (suspend (E) -> Unit),
    private val syncCallback: (suspend () -> Unit),
    private val desyncCallback: (suspend () -> Unit),
    private val sender: Sender
) : Callbacks<Data, Op, T> {

    /**
     * Used to ensure serialized invocations of [Handle] events. This can be per-[Handle],
     * per-[Particle], per-[Arc], depending on the [Sender] used. Typically, it will be
     * per-[Particle] when handles are hosted inside of a [Particle]
     */
    private fun invokeWithSender(block: suspend () -> Unit) = sender(block)

    override fun onUpdate(handle: StorageHandle<Data, Op, T>, op: Op) = invokeWithSender {
        updateCallback.invoke(fetchFunc())
    }

    override fun onSync(handle: StorageHandle<Data, Op, T>) = invokeWithSender {
        syncCallback.invoke()
    }

    override fun onDesync(handle: StorageHandle<Data, Op, T>) = invokeWithSender {
        desyncCallback.invoke()
    }
}

private fun <T : Entity> T.ensureIdentified(idGenerator: Id.Generator, handleName: String): T {
    if (this.internalId == "") {
        this.internalId = idGenerator.newChildId(
            // TODO: should we allow this to be plumbed through?
            idGenerator.newArcId("dummy-arc"),
            handleName
        ).toString()
    }
    return this
}
