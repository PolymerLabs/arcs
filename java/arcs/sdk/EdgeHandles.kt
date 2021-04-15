package arcs.sdk

import arcs.core.entity.Handle
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.Storable
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
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
 *  - All read operations will suspend as required to await handle synchronization.
 *  - All write operations will be applied immediately to the local handle data model. They will
 *    return a Job that will be completed once the operation has been sent to the backing store
 *    for this handle; it is not required that join() is called on these jobs.
 *
 * Query handles are not supported at this time.
 */

interface EdgeReadSingletonHandle<E> {
  suspend fun fetch(): E?
}

interface EdgeWriteSingletonHandle<I> {
  suspend fun store(element: I): Job
  suspend fun clear(): Job
}

interface EdgeReadWriteSingletonHandle<E, I> :
  EdgeReadSingletonHandle<E>, EdgeWriteSingletonHandle<I>

interface EdgeReadCollectionHandle<E> {
  suspend fun size(): Int
  suspend fun isEmpty(): Boolean
  suspend fun fetchAll(): Set<E>
  suspend fun fetchById(entityId: String): E?
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

/** Base class for the edge handle implementations. */
abstract class EdgeHandle {

  // The "real" arc handle; assigned by setHandles() in the generated particle implementation.
  lateinit var handle: Handle
  private var ready = Job()

  suspend fun <T> readOp(op: () -> T): T = withContext(handle.dispatcher) {
    ready.join()
    op()
  }

  suspend fun <T> writeOp(op: () -> T): T = withContext(handle.dispatcher) { op() }

  // Invoked by onReady in the generated particle implementation.
  fun moveToReady() {
    ready.complete()
  }
}

@Suppress("UNCHECKED_CAST")
class EdgeSingletonHandle<E : Storable, I : Storable> :
  EdgeHandle(), EdgeReadWriteSingletonHandle<E, I> {

  override suspend fun fetch() = readOp {
    (handle as ReadSingletonHandle<E>).fetch()
  }

  override suspend fun store(element: I) = writeOp {
    (handle as WriteSingletonHandle<I>).store(element)
  }

  override suspend fun clear() = writeOp {
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

  override suspend fun size() = readOp {
    readHandle.size()
  }

  override suspend fun isEmpty() = readOp {
    readHandle.isEmpty()
  }

  override suspend fun fetchAll() = readOp {
    readHandle.fetchAll()
  }

  override suspend fun fetchById(entityId: String) = readOp {
    readHandle.fetchById(entityId)
  }

  override suspend fun store(element: I) = writeOp {
    writeHandle.store(element)
  }

  override suspend fun storeAll(elements: Collection<I>) = writeOp {
    writeHandle.storeAll(elements)
  }

  override suspend fun clear() = writeOp {
    writeHandle.clear()
  }

  override suspend fun remove(element: I) = writeOp {
    writeHandle.remove(element)
  }

  override suspend fun removeById(id: String) = writeOp {
    writeHandle.removeById(id)
  }
}
