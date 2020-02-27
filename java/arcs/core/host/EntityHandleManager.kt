package arcs.core.host

import arcs.core.common.Id
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.storage.Callbacks
import arcs.core.storage.Handle as StorageHandle
import arcs.core.storage.StorageKey
import arcs.core.storage.api.Entity
import arcs.core.storage.api.EntitySpec
import arcs.core.storage.api.Handle
import arcs.core.storage.api.ReadWriteCollection
import arcs.core.storage.api.ReadWriteSingleton
import arcs.core.storage.api.ReadableCollection
import arcs.core.storage.api.ReadableSingleton
import arcs.core.storage.api.WritableCollection
import arcs.core.storage.api.WritableSingleton
import arcs.core.storage.handle.CollectionImpl
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SetData
import arcs.core.storage.handle.SetHandle
import arcs.core.storage.handle.SetOp
import arcs.core.storage.handle.SingletonData
import arcs.core.storage.handle.SingletonHandle
import arcs.core.storage.handle.SingletonImpl
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
 * [ReadableSingleton] for [HandleMode.Read]. To obtain a [HandleHolder], use
 * `arcs_kt_schema` on a manifest file to generate a `{ParticleName}Handles' class, and
 * invoke its default constructor, or obtain it from the [BaseParticle.handles] field.
 */
class EntityHandleManager(val handleManager: HandleManager) {
    /**
     * Creates and returns a new [SingletonHandle]. Will also populate the appropriate field inside
     * the given [HandleHolder].
     *
     * @property handleHolder contains handle and entitySpec declarations
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun createSingletonHandle(
        handleHolder: HandleHolder,
        handleName: String,
        storageKey: StorageKey,
        schema: Schema,
        handleMode: HandleMode = HandleMode.ReadWrite,
        idGenerator: Id.Generator = Id.Generator.newSession(),
        sender: Sender = ::defaultSender
    ) = createSdkHandle(
        handleHolder,
        handleName,
        handleManager.singletonHandle(storageKey, schema, canRead = handleMode != HandleMode.Write),
        handleMode,
        idGenerator,
        sender
    )

    /**
     * Creates and returns a new [SetHandle]. Will also populate the appropriate field inside
     * the given [HandleHolder].
     *
     * @property handleHolder contains handle and entitySpec declarations
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun createSetHandle(
        handleHolder: HandleHolder,
        handleName: String,
        storageKey: StorageKey,
        schema: Schema,
        handleMode: HandleMode = HandleMode.ReadWrite,
        idGenerator: Id.Generator = Id.Generator.newSession(),
        sender: Sender = ::defaultSender
    ) = createSdkHandle(
        handleHolder,
        handleName,
        handleManager.setHandle(storageKey, schema, canRead = handleMode != HandleMode.Write),
        handleMode,
        idGenerator,
        sender
    )

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

    /**
     * Create a [Handle] given a [StorageHandle] and a [EntitySpec] definition.
     *
     * @property entitySpec used to deserialize [RawEntity] types into [Entity]
     * @property handleName readable name for the handle, usually from a recipe
     * @property storageHandle a [StorageHandle] usually obtained thru [HandleManager]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    private fun <T : Entity> createSdkHandle(
        entitySpec: EntitySpec<T>,
        handleName: String,
        storageHandle: StorageHandle<*, *, *>,
        handleMode: HandleMode,
        idGenerator: Id.Generator,
        sender: Sender
    ): Handle {
        return when (storageHandle) {
            is SingletonHandle<*> -> createSingletonHandle(
                entitySpec,
                handleName,
                storageHandle as SingletonHandle<RawEntity>,
                handleMode,
                idGenerator,
                sender
            )
            is SetHandle<*> -> createSetHandle(
                entitySpec,
                handleName,
                storageHandle as SetHandle<RawEntity>,
                handleMode,
                idGenerator,
                sender
            )
            else -> throw Exception("Unknown storage handle type ${storageHandle::class}")
        }
    }

    /**
     * Create a [Handle] given a [StorageHandle] and a [HandleHolder] with [EntitySpec] definitions.
     *
     * @property handleHolder contains handle and entitySpec declarations
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageHandle a [StorageHandle] usually obtained thru [HandleManager]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    private fun createSdkHandle(
        handleHolder: HandleHolder,
        handleName: String,
        storageHandle: StorageHandle<*, *, *>,
        handleMode: HandleMode,
        idGenerator: Id.Generator,
        sender: Sender
    ): Handle {
        val entitySpec: EntitySpec<*>? =
            handleHolder.entitySpecs[handleName] as? EntitySpec<*>
        val handle = createSdkHandle(
            entitySpec ?: throw IllegalArgumentException(
                "No EntitySpec found for $handleName on HandleHolder ${handleHolder::class}"
            ),
            handleName,
            storageHandle,
            handleMode,
            idGenerator,
            sender
        )
        val handleMap = handleHolder.handles as MutableMap<String, Handle>
        handleMap.put(handleName, handle)
        return handle
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

internal open class ReadableSingletonHandleImpl<T : Entity>(
    val entitySpec: EntitySpec<T>,
    val handleName: String,
    val storageHandle: SingletonHandle<RawEntity>,
    val sender: Sender
) : HandleEventBase<T?, ReadableSingleton<T>>(), ReadableSingleton<T> {
    init {
        storageHandle.callback = SingletonSenderCallbackAdapter(
            this::fetch,
            this::invokeUpdate,
            this::fireSync,
            this::fireDesync,
            sender
        )
    }

    private suspend fun invokeUpdate(entity: T?): Unit = fireUpdate(entity)

    override val name: String
        get() = handleName

    override suspend fun fetch(): T? = storageHandle.fetch()?.let {
        rawEntity -> entitySpec.deserialize(rawEntity)
    }
}

internal class WritableSingletonHandleImpl<T : Entity>(
    val handleName: String,
    val storageHandle: SingletonHandle<RawEntity>,
    val idGenerator: Id.Generator
) : WritableSingleton<T> {
    override val name: String
        get() = handleName

    override suspend fun store(entity: T) {
        storageHandle.store(entity.serialize())
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
    private val writableSingleton: WritableSingletonHandleImpl<T> = WritableSingletonHandleImpl(
        handleName,
        storageHandle,
        idGenerator
    )
) : ReadWriteSingleton<T>,
    ReadableSingletonHandleImpl<T>(entitySpec, handleName, storageHandle, sender),
    WritableSingleton<T> by writableSingleton {
    override val name: String
        get() = writableSingleton.name
}

internal open class ReadableCollectionHandleImpl<T : Entity>(
    val entitySpec: EntitySpec<T>,
    val handleName: String,
    val storageHandle: SetHandle<RawEntity>,
    val sender: Sender
) : HandleEventBase<Set<T>, ReadableCollection<T>>(), ReadableCollection<T> {
    init {
        storageHandle.callback = CollectionSenderCallbackAdapter(
            this::fetchAll,
            this::invokeUpdate,
            this::fireSync,
            this::fireDesync,
            sender
        )
    }

    private suspend fun invokeUpdate(set: Set<T>) = fireUpdate(set)

    override val name: String
        get() = handleName

    override suspend fun size(): Int = fetchAll().size

    override suspend fun isEmpty() = fetchAll().isEmpty()

    override suspend fun fetchAll(): Set<T> = storageHandle.fetchAll().map {
        entitySpec.deserialize(it)
    }.toSet()
}

internal class WritableCollectionHandleImpl<T : Entity>(
    val handleName: String,
    val storageHandle: CollectionImpl<RawEntity>,
    val idGenerator: Id.Generator
) : WritableCollection<T> {
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
    private val writableCollection: WritableCollectionHandleImpl<T> = WritableCollectionHandleImpl(
        handleName,
        storageHandle,
        idGenerator
    )
) : ReadWriteCollection<T>,
    ReadableCollectionHandleImpl<T>(entitySpec, handleName, storageHandle, sender),
    WritableCollection<T> by writableCollection {
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

private fun <T : Entity> createSingletonHandle(
    entitySpec: EntitySpec<T>,
    handleName: String,
    storageHandle: SingletonImpl<RawEntity>,
    handleMode: HandleMode,
    idGenerator: Id.Generator,
    sender: Sender
): Handle {
    return when (handleMode) {
        HandleMode.ReadWrite -> ReadWriteSingletonHandleImpl<T>(
            entitySpec,
            handleName,
            storageHandle,
            idGenerator,
            sender
        )
        HandleMode.Read -> ReadableSingletonHandleImpl<T>(
            entitySpec,
            handleName,
            storageHandle,
            sender
        )
        HandleMode.Write -> WritableSingletonHandleImpl<T>(
            handleName,
            storageHandle,
            idGenerator
        )
    }
}

private fun <T : Entity> createSetHandle(
    entitySpec: EntitySpec<T>,
    handleName: String,
    storageHandle: CollectionImpl<RawEntity>,
    handleMode: HandleMode,
    idGenerator: Id.Generator,
    sender: Sender
): Handle {
    return when (handleMode) {
        HandleMode.ReadWrite -> ReadWriteCollectionHandleImpl<T>(
            entitySpec,
            handleName,
            storageHandle,
            idGenerator,
            sender
        )
        HandleMode.Read -> ReadableCollectionHandleImpl<T>(
            entitySpec,
            handleName,
            storageHandle,
            sender
        )
        HandleMode.Write -> WritableCollectionHandleImpl<T>(
            handleName,
            storageHandle,
            idGenerator
        )
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
