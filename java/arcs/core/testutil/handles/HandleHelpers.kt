/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.testutil.handles

import arcs.core.entity.Entity
import arcs.core.entity.Handle
import arcs.core.entity.QueryCollectionHandle
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadableHandle
import arcs.core.entity.Reference
import arcs.core.entity.RemoveQueryCollectionHandle
import arcs.core.entity.Storable
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.withContext

/** Calls [Handle.close] with the handle's dispatcher context. */
suspend fun <H : Handle> H.dispatchClose() = withContext(dispatcher) { close() }

/** Calls [ReadableHandle.createReference] with the handle's dispatcher context. */
suspend fun <H : ReadableHandle<V, U>, V, U, E : Entity>
H.dispatchCreateReference(entity: E): Reference<E> =
  withContext(dispatcher) { createReference(entity) }

/** Calls [ReadSingletonHandle.fetch] with the handle's dispatcher context. */
suspend fun <H : ReadSingletonHandle<E>, E> H.dispatchFetch(): E? =
  withContext(dispatcher) { fetch() }

/**
 * Calls [WriteSingletonHandle.store] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 */
suspend fun <H : WriteSingletonHandle<I>, I> H.dispatchStore(element: I) {
  withContext(dispatcher) { store(element) }.join()
  getProxy().waitForIdle()
}

/**
 * Calls [WriteSingletonHandle.clear] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 */
suspend fun <H : WriteSingletonHandle<I>, I> H.dispatchClear() {
  withContext(dispatcher) { clear() }.join()
  getProxy().waitForIdle()
}

/** Calls [ReadCollectionHandle.size] with the handle's dispatcher context. */
suspend fun <H : ReadCollectionHandle<E>, E> H.dispatchSize(): Int =
  withContext(dispatcher) { size() }

/** Calls [ReadCollectionHandle.isEmpty] with the handle's dispatcher context. */
suspend fun <H : ReadCollectionHandle<E>, E> H.dispatchIsEmpty(): Boolean =
  withContext(dispatcher) { isEmpty() }

/** Calls [ReadCollectionHandle.fetchAll] with the handle's dispatcher context. */
suspend fun <H : ReadCollectionHandle<E>, E> H.dispatchFetchAll(): Set<E> =
  withContext(dispatcher) { fetchAll() }

/** Calls [ReadCollectionHandle.fetchById] with the handle's dispatcher context. */
suspend fun <H : ReadCollectionHandle<E>, E> H.dispatchFetchById(id: String): E? =
  withContext(dispatcher) { fetchById(id) }

/**
 * Calls [WriteCollectionHandle.store] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 *
 * This allows multiple elements to be stored and will wait until all the operations are done.
 */
suspend fun <H : WriteCollectionHandle<I>, I> H.dispatchStore(first: I, vararg rest: I) {
  withContext(dispatcher) {
    listOf(store(first)) + rest.map { store(it) }
  }.joinAll()
  getProxy().waitForIdle()
}

/**
 * Calls [WriteCollectionHandle.remove] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 *
 * This allows multiple elements to be removed and will wait until all the operations are done.
 */
suspend fun <H : WriteCollectionHandle<I>, I> H.dispatchRemove(first: I, vararg rest: I) {
  withContext(dispatcher) {
    listOf(remove(first)) + rest.map { remove(it) }
  }.joinAll()
  getProxy().waitForIdle()
}

/**
 * Calls [WriteCollectionHandle.clear] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 */
suspend fun <H : WriteCollectionHandle<I>, I> H.dispatchClear() {
  withContext(dispatcher) { clear() }.join()
  getProxy().waitForIdle()
}

/** Calls [QueryCollectionHandle.query] with the handle's dispatcher context. */
suspend fun <H : QueryCollectionHandle<E, A>, E : Storable, A> H.dispatchQuery(args: A): Set<E> =
  withContext(dispatcher) { query(args) }

/** Calls [RemoveQueryCollectionHandle.removeByQuery] with the handle's dispatcher context. */
suspend fun <H : RemoveQueryCollectionHandle<A>, A> H.dispatchRemoveByQuery(args: A) {
  withContext(dispatcher) { removeByQuery(args) }.join()
  getProxy().waitForIdle()
}
