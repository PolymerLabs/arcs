package arcs.core.storage

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.CrdtSingleton.Data
import arcs.core.crdt.CrdtSingleton.Operation.Clear
import arcs.core.crdt.CrdtSingleton.Operation.Update
import arcs.core.crdt.internal.VersionMap

// Todo: Reconcile differences with Particle
interface Particle {
    fun onHandleSync(handle: Handle<*,*,*>)
    fun onHandleDesync(handle: Handle<*,*,*>)
    fun onHandleUpdate(handle: Handle<*,*,*>)
}

// Return type for StorageProxy.getParticleView
data class ValueAndVersion<T>(val value: T, val versionMap: VersionMap)

// TODO - actually implement storage proxy
interface StorageProxy<StorageType : CrdtData, Operation : CrdtOperation, ConsumerType> {
    fun getParticleView(): ValueAndVersion<ConsumerType>
    fun applyOp(op: Operation): Boolean
}

/**
 * Base class for handles.
 *
 * OPEN QUESTIONS:
 * * Entity creation
 * * Serialization (and if so, across what boundaries?)
 * * Update messages to particle... Messaging to particle in general
 */
abstract class Handle<StorageType : CrdtData, Operation : CrdtOperation, ConsumerType>(
    val key: String,
    val storageProxy: StorageProxy<StorageType, Operation, ConsumerType>,
    val particle: Particle,
    var direction: Direction,
    val name: String="")
{

    class HandleNotReadableException : IllegalStateException("handle not readable")
    class HandleNotWriteableException : IllegalStateException("handle not writable")

    enum class Direction(val canRead: Boolean, val canWrite: Boolean) {
        Unconnected(false, false),
        In(true, false),
        Out(false, true),
        InOut(true, true)
    }

    var clock: VersionMap=VersionMap()
        protected set

    fun incrementClock() {
        this.clock[this.key] += 1
    }

    abstract fun onSync()
    abstract fun onDesync()
    abstract fun onUpdate(op: Operation, version: VersionMap)

    fun mustBeReadable() { this.direction.canRead || throw HandleNotReadableException() }
    fun mustBeWritable() { this.direction.canWrite || throw HandleNotWriteableException() }
}

/**
 * Implementation of a handle containing a single value that can be set and get
 */
class Singleton<T : Referencable>(
    key: String,
    storageProxy: StorageProxy<Data<T>, CrdtSingleton.IOperation<T>, T?>,
    particle: Particle,
    direction: Direction,
    name: String=""
) : Handle<Data<T>, CrdtSingleton.IOperation<T>, T?>(key, storageProxy, particle, direction, name) {

    //region getters/setters
    fun get(): T? {
        mustBeReadable()
        val (value, versionMap) = storageProxy.getParticleView();
        this.clock = versionMap
        return value
    }

    fun set(value: T): Boolean {
        mustBeWritable()
        incrementClock()
        return storageProxy.applyOp(Update(key, clock, value))
    }

    fun clear(): Boolean {
        mustBeWritable()
        return this.storageProxy.applyOp(Clear(key, clock))
    }
    //endregion

    //region event handlers
    override fun onUpdate(op: CrdtSingleton.IOperation<T>, version: VersionMap) {
        mustBeReadable()
        this.clock = version
        // TODO - pass update message with data changes?
        // Pass change to particle
        particle.onHandleUpdate(this)
    }

    override fun onSync() {
        mustBeReadable()
        particle.onHandleSync(this)
    }

    override fun onDesync() {
        mustBeReadable()
        particle.onHandleDesync(this)
    }
    //endregion
}

class Collection<T : Referencable>(
    key: String,
    storageProxy: StorageProxy<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>,
    particle: Particle,
    direction: Direction,
    name: String=""
) : Handle<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>(key, storageProxy, particle, direction, name) {

    //region getters/setters
    fun add(entity: T) {
        mustBeWritable()
        incrementClock()
        storageProxy.applyOp(CrdtSet.Operation.Add(clock, key, entity))
    }

    fun add(vararg entities: T) = add(entities.toSet())

    fun add(entities: Iterable<T>) {
        mustBeWritable()
        entities.map(::add)
    }

    fun remove(entity: T) {
        mustBeWritable()
        storageProxy.applyOp(CrdtSet.Operation.Remove(clock, key, entity))
    }

    fun clear() {
        mustBeWritable()
        storageProxy.getParticleView().value?.map(::remove)
    }

    fun get(id: String): T? {
        mustBeReadable()
        val (value, versionMap) = storageProxy.getParticleView();
        this.clock = versionMap
        return value?.find { it.id == id }
    }

    fun toSet(): Set<T>?  {
        mustBeReadable()
        return storageProxy.getParticleView().value
    }
    //endregion


    //region event handlers
    override fun onUpdate(op: CrdtSet.IOperation<T>, version: VersionMap) {
        mustBeReadable()
        this.clock = version
        // Pass change to particle
        // TODO - pass update message with data changes?
        particle.onHandleUpdate(this)
    }

    override fun onSync() {
        mustBeReadable()
        particle.onHandleSync(this)
    }

    override fun onDesync() {
        mustBeReadable()
        particle.onHandleDesync(this)
    }
    //endregion
}
