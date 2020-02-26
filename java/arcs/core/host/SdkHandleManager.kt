package arcs.core.host

import arcs.core.common.Id
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.storage.Callbacks
import arcs.core.storage.StorageKey
import arcs.core.storage.handle.CollectionImpl
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SetHandle
import arcs.core.storage.handle.SingletonHandle
import arcs.core.storage.handle.SingletonImpl
import arcs.core.storage.util.SendQueue
import arcs.sdk.Entity
import arcs.sdk.Handle
import arcs.sdk.HandleHolder
import arcs.sdk.JvmEntity
import arcs.sdk.JvmEntitySpec
import arcs.sdk.Particle
import arcs.sdk.ReadWriteCollection
import arcs.sdk.ReadWriteSingleton
import arcs.sdk.ReadableCollection
import arcs.sdk.ReadableSingleton
import arcs.sdk.WritableCollection
import arcs.sdk.WritableSingleton
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import arcs.core.storage.Handle as StorageHandle

typealias Sender = (block: suspend () -> Unit) -> Unit

/**
 * Specifies the access mode for a [Handle].
 */
enum class HandleMode {
    /** [Handle] is read only. */
    Read,
    /** [Handle] is write only. */
    Write,
    /** [Handle] is read-write. */
    ReadWrite
}

/**
 * Wraps a [HandleManager] and creates SDK handles based on [HandleMode], such as
 * [ReadableSingleton] for [HandleMode.Read]. To obtain a [HandleHolder], use
 * `arcs_kt_schema` on a manifest file to generate a `{ParticleName}Handles' class, and
 * invoke its default constructor, or obtain it from the [BaseParticle.handles] field.
 */
class SdkHandleManager(val handleManager: HandleManager) {
    /**
     * Create a [SingletonHandle] given a [StorageKey], [Schema],  a [HandleHolder] with
     * [JvmEntitySpec] definitions indexed by `handleName`.
     *
     * @property handleHolder contains handle and entitySpec declarations
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun sdkSingletonHandle(
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
        idGenerator,
        sender
    )

    /**
     * Create a [SetHandle] given a [StorageKey], [Schema],  a [HandleHolder] with [JvmEntitySpec]
     * definitions indexed by `handleName`.
     *
     * @property handleHolder contains handle and entitySpec declarations
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageKey a [StorageKey]
     * @property schema the [Schema] for this [StorageKey]
     * @property handleMode whether a handle is Read,Write, or ReadWrite (default)
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    suspend fun sdkSetHandle(
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
        idGenerator,
        sender
    )

    private fun defaultSender(block: suspend () -> Unit) {
        GlobalScope.launch {
            block()
        }
    }

    /**
     * Create a [Handle] given a [StorageHandle] and a [JvmEntitySpec] definition.
     *
     * @property entitySpec used to deserialize [RawEntity] types into [Entity]
     * @property handleName readable name for the handle, usually from a recipe
     * @property storageHandle a [StorageHandle] usually obtained thru [HandleManager]
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    private fun <T : Entity> createSdkHandle(
        entitySpec: JvmEntitySpec<T>,
        handleName: String,
        storageHandle: StorageHandle<out CrdtSet.Data<RawEntity>, out CrdtOperationAtTime, out Any?>,
        idGenerator: Id.Generator,
        sender: Sender
    ): Handle {
        return when (storageHandle) {
            is SingletonHandle<*> -> createSingletonHandle(
                entitySpec,
                handleName,
                storageHandle as SingletonHandle<RawEntity>,
                idGenerator,
                sender
            )
            is SetHandle<*> -> createSetHandle(
                entitySpec,
                handleName,
                storageHandle as SetHandle<RawEntity>,
                idGenerator,
                sender
            )
            else -> throw Exception("Unknown storage handle type ${storageHandle::class}")
        }
    }

    /**
     * Create a [Handle] given a [StorageHandle] and a [HandleHolder] with [JvmEntitySpec] definitions.
     *
     * @property handleHolder contains handle and entitySpec declarations
     * @property handleName name for the handle, must be present in [HandleHolder.entitySpecs]
     * @property storageHandle a [StorageHandle] usually obtained thru [HandleManager]
     * @property sender block used to execute callback lambdas
     * @property idGenerator used to generate unique IDs for newly stored entities.
     */
    private fun createSdkHandle(
        handleHolder: HandleHolder,
        handleName: String,
        storageHandle: StorageHandle<out CrdtSet.Data<RawEntity>, out CrdtOperationAtTime, out Any?>,
        idGenerator: Id.Generator,
        sender: Sender
    ): HandleHolder {
        val entitySpec: JvmEntitySpec<*>? =
            handleHolder.entitySpecs[handleName] as? JvmEntitySpec<*>
        val handle = createSdkHandle(
            entitySpec ?: throw EntitySpecNotFound(handleName, handleHolder),
            handleName,
            storageHandle,
            idGenerator,
            sender
        )
        val handleMap = handleHolder.map as MutableMap<String, Handle>
        handleMap.put(handleName, handle)
        return handleHolder
    }
}

internal open class HandleEventBase<T> {
    protected val onUpdateActions: MutableList<suspend (T) -> Unit> = mutableListOf()

    fun onUpdate(action: suspend (T) -> Unit) {
        onUpdateActions.add(action)
    }

    protected suspend fun fireUpdate(value: T): Unit {
        onUpdateActions.forEach { action -> action(value) }
    }
}

internal open class ReadableSingletonHandleImpl<T : Entity>(
    val entitySpec: JvmEntitySpec<T>,
    val handleName: String,
    val storageHandle: SingletonHandle<RawEntity>,
    val sender: Sender
) : HandleEventBase<T?>(), ReadableSingleton<T> {
    var updateCallback: (suspend (T?) -> Unit?)? = null

    init {
        storageHandle.callback = QueuingCallbackAdapter(
            this::fetch,
            this::invokeUpdate,
            sender
        )
    }

    private suspend fun invokeUpdate(entity: T?): Unit? = fireUpdate(entity)

    override val name: String
        get() = handleName

    override suspend fun fetch(): T? = storageHandle.fetch()?.let {
        rawEntity -> rawEntity.deserialize<T>(entitySpec)
    }
}

internal class WritableSingletonHandleImpl<T : Entity>(
    val handleName: String,
    val storageHandle: SingletonHandle<RawEntity>,
    val idGenerator: Id.Generator
) : WritableSingleton<T> {
    override val name: String
        get() = handleName

    override suspend fun set(entity: T) {
        storageHandle.set(entity.serialize())
    }

    override suspend fun clear() =
        storageHandle.clear()
}

internal class ReadWriteSingletonHandleImpl<T : Entity>(
    entitySpec: JvmEntitySpec<T>,
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
    val entitySpec: JvmEntitySpec<T>,
    val handleName: String,
    val storageHandle: CollectionImpl<RawEntity>,
    val sender: Sender
) : HandleEventBase<Set<T>>(), ReadableCollection<T> {
    init {
        storageHandle.callback = QueuingCallbackAdapter(
            this::fetchAll,
            this::invokeUpdate,
            sender
        )
    }

    private suspend fun invokeUpdate(set: Set<T>) = fireUpdate(set)

    override val name: String
        get() = handleName

    override suspend fun size(): Int = fetchAll().size

    override suspend fun isEmpty() = fetchAll().isEmpty()

    override suspend fun fetchAll(): Set<T> = storageHandle.fetchAll().map {
       it.deserialize<T>(entitySpec)
    }.toSet()
}

internal class WritableCollectionHandleImpl<T : Entity>(
    val handleName: String,
    val storageHandle: CollectionImpl<RawEntity>,
    val idGenerator: Id.Generator
) : WritableCollection<T> {
    override val name: String
        get() = handleName

    override suspend fun store(entity: T) = storageHandle.store(
        entity.ensureIdentified(idGenerator, handleName).serialize()
    )

    override suspend fun clear() = storageHandle.clear()

    override suspend fun remove(entity: T) = storageHandle.remove(entity.serialize())
}

internal class ReadWriteCollectionHandleImpl<T : Entity>(
    entitySpec: JvmEntitySpec<T>,
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
 * from a queue, which can be per-handle, or shared, e.g. at the [Particle], [ArcHost], level.
 */
internal class QueuingCallbackAdapter<Op : CrdtOperation, E>(
    private val fetchFunc: suspend () -> E,
    private val updateCallback: (suspend (E) -> Unit?),
    private val sender: Sender
) : Callbacks<Op> {

    /**
     * Used to ensure serialized invocations of [Handle] events. This can be per-[Handle],
     * per-[Particle], per-[Arc], depending on the [SendQueue] used. Typically, it will be
     * per-[Particle] when handles are hosted inside of a [Particle]
     */
    private fun invokeOnQueue(block: suspend () -> Unit) = sender(block)

    override fun onUpdate(op: Op) {
        invokeOnQueue {
            updateCallback.invoke(fetchFunc())
        }
    }

    override fun onSync() {
    }

    override fun onDesync() {
    }
}

internal fun <T : Entity> RawEntity.deserialize(entitySpec: JvmEntitySpec<T>) =
    entitySpec.deserialize(this)

internal fun <T : Entity> T.serialize() = (this as JvmEntity).serialize()

private fun <T : Entity> createSingletonHandle(
    entitySpec: JvmEntitySpec<T>,
    handleName: String,
    storageHandle: SingletonImpl<RawEntity>,
    idGenerator: Id.Generator,
    sender: Sender
): Handle {
    // TODO: implement read-only handles
    return if (storageHandle.canRead) ReadWriteSingletonHandleImpl<T>(
        entitySpec,
        handleName,
        storageHandle,
        idGenerator,
        sender
    ) else WritableSingletonHandleImpl<T>(
        handleName,
        storageHandle,
        idGenerator
    )
}

private fun <T : Entity> createSetHandle(
    entitySpec: JvmEntitySpec<T>,
    handleName: String,
    storageHandle: CollectionImpl<RawEntity>,
    idGenerator: Id.Generator,
    sender: Sender
): Handle {
    // TODO: implement read-only handles
    return if (storageHandle.canRead) ReadWriteCollectionHandleImpl<T>(
        entitySpec,
        handleName,
        storageHandle,
        idGenerator,
        sender
    ) else WritableCollectionHandleImpl<T>(
        handleName,
        storageHandle,
        idGenerator
    )
}

private fun <T : Entity> T.ensureIdentified(idGenerator: Id.Generator, handleName: String): T {
    if (this.internalId == "") {
        this.internalId = idGenerator.newChildId(
            // TODO: should be allow this to be plumbed through?
            idGenerator.newArcId("dummy-arc"),
            handleName
        ).toString()
    }
    return this
}
