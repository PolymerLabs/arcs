package arcs.sdk

import arcs.core.entity.Handle
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.Storable
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Job
import kotlinx.coroutines.withContext

/*
 * To facilitate safe read/write access to data handles in running arcs, particles can be
 * annotated with '@edge' in the manifest. This will cause the following set of changes to
 * the code generation output:
 *  - The generated class will be concrete and final instead of an abstract base class.
 *  - The particle lifecycle will be managed internally to this class; clients will not have
 *    any access to lifecycle events.
 *  - Handles will be exposed via the Edge*Handle interfaces given below. All edge handle methods
 *    are asynchronous and may be invoked at any time after the particle has been created.
 *  - All read operations will return a CompletableDeferred around the requested value.
 *  - All write operations will be applied immediately, but the APIs still need to be asynchronous
 *    so they can operate on the handle's dispatcher.
 *
 * Query handles are not supported at this time.
 */

interface EdgeReadSingletonHandle<E> {
  suspend fun fetch(): CompletableDeferred<E?>
}

interface EdgeWriteSingletonHandle<I> {
  suspend fun store(element: I): Job
  suspend fun clear(): Job
}

interface EdgeReadWriteSingletonHandle<E, I> :
  EdgeReadSingletonHandle<E>, EdgeWriteSingletonHandle<I>

interface EdgeReadCollectionHandle<E> {
  suspend fun size(): CompletableDeferred<Int>
  suspend fun isEmpty(): CompletableDeferred<Boolean>
  suspend fun fetchAll(): CompletableDeferred<Set<E>>
  suspend fun fetchById(entityId: String): CompletableDeferred<E?>
}

interface EdgeWriteCollectionHandle<I> {
  suspend fun store(element: I): Job
  suspend fun storeAll(elements: Collection<I>): Job
  suspend fun clear(): Job
  suspend fun remove(element: I): Job
  suspend fun removeById(id: String): Job
}

interface EdgeReadWriteCollectionHandle<E, I> :
  EdgeReadCollectionHandle<E>, EdgeWriteCollectionHandle<I>

/**
 * Base class for the edge handle implementations. This provides the latching and lifecycle logic
 * that queues read operations for later completion once the backing handle has been synchronized.
 */
abstract class EdgeHandle {

  /** Holds a read operation that was invoked prior to the onReady lifecycle event. */
  class PendingOp<T>(val op: () -> T, val deferred: CompletableDeferred<T>) {
    fun complete() = deferred.complete(op())
  }

  // The "real" arc handle; assigned by setHandles() in the generated particle implementation.
  lateinit var handle: Handle
  private var ready = false
  private val pending = mutableListOf<PendingOp<*>>()

  protected val dispatcher: CoroutineDispatcher
    get() = handle.dispatcher

  // For read operations: if the particle has reached onReady, execute the operation and complete
  // the returned deferred object immediately. Otherwise, queue the op for later invocation.
  suspend fun <T> executeOrDefer(op: () -> T) = withContext(dispatcher) {
    CompletableDeferred<T>().also {
      if (ready) {
        it.complete(op())
      } else {
        pending.add(PendingOp(op, it))
      }
    }
  }

  // Invoked by onReady in the generated particle implementation.
  fun moveToReady() {
    ready = true
    pending.forEach { it.complete() }
    pending.clear()
  }
}

@Suppress("UNCHECKED_CAST")
class EdgeSingletonHandle<E : Storable, I : Storable> :
  EdgeHandle(), EdgeReadWriteSingletonHandle<E, I> {

  override suspend fun fetch() = executeOrDefer {
    (handle as ReadSingletonHandle<E>).fetch()
  }

  override suspend fun store(element: I) = withContext(dispatcher) {
    (handle as WriteSingletonHandle<I>).store(element)
  }

  override suspend fun clear() = withContext(dispatcher) {
    (handle as WriteSingletonHandle<I>).clear()
  }
}

@Suppress("UNCHECKED_CAST")
class EdgeCollectionHandle<E : Storable, I : Storable> :
  EdgeHandle(), EdgeReadWriteCollectionHandle<E, I> {

  private val readHandle: ReadCollectionHandle<E>
    get() = handle as ReadCollectionHandle<E>

  private val writeHandle: WriteCollectionHandle<I>
    get() = handle as WriteCollectionHandle<I>

  override suspend fun size() = executeOrDefer {
    readHandle.size()
  }

  override suspend fun isEmpty() = executeOrDefer {
    readHandle.isEmpty()
  }

  override suspend fun fetchAll() = executeOrDefer {
    readHandle.fetchAll()
  }

  override suspend fun fetchById(entityId: String) = executeOrDefer {
    readHandle.fetchById(entityId)
  }

  override suspend fun store(element: I) = withContext(dispatcher) {
    writeHandle.store(element)
  }

  override suspend fun storeAll(elements: Collection<I>) = withContext(dispatcher) {
    writeHandle.storeAll(elements)
  }

  override suspend fun clear() = withContext(dispatcher) {
    writeHandle.clear()
  }

  override suspend fun remove(element: I) = withContext(dispatcher) {
    writeHandle.remove(element)
  }

  override suspend fun removeById(id: String) = withContext(dispatcher) {
    writeHandle.removeById(id)
  }
}
