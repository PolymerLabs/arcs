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
import arcs.core.entity.Storable
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.withContext

/** Calls [Handle.close] with the handle's dispatcher context. */
suspend fun <H : Handle> H.dispatchClose() = withContext(dispatcher) { closeZZ() }

/** Calls [ReadableHandle.createReference] with the handle's dispatcher context. */
suspend fun <H : ReadableHandle<U>, U, E : Entity>
            H.dispatchCreateReference(entity: E): Reference<E> =
    withContext(dispatcher) { createReferenceZZ(entity) }

/** Calls [ReadSingletonHandle.fetch] with the handle's dispatcher context. */
suspend fun <H : ReadSingletonHandle<T>, T> H.dispatchFetch(): T? =
    withContext(dispatcher) { fetchZZ() }

/**
 * Calls [WriteSingletonHandle.store] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 */
suspend fun <H : WriteSingletonHandle<T>, T> H.dispatchStore(element: T) {
    withContext(dispatcher) { storeZZ(element) }.join()
    getProxy().waitForIdle()
}

/**
 * Calls [WriteSingletonHandle.clear] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 */
suspend fun <H : WriteSingletonHandle<T>, T> H.dispatchClear() {
    withContext(dispatcher) { clearZZ() }.join()
    getProxy().waitForIdle()
}

/** Calls [ReadCollectionHandle.size] with the handle's dispatcher context. */
suspend fun <H : ReadCollectionHandle<T>, T> H.dispatchSize(): Int =
    withContext(dispatcher) { sizeZZ() }

/** Calls [ReadCollectionHandle.isEmpty] with the handle's dispatcher context. */
suspend fun <H : ReadCollectionHandle<T>, T> H.dispatchIsEmpty(): Boolean =
    withContext(dispatcher) { isEmptyZZ() }

/** Calls [ReadCollectionHandle.fetchAll] with the handle's dispatcher context. */
suspend fun <H : ReadCollectionHandle<T>, T> H.dispatchFetchAll(): Set<T> =
    withContext(dispatcher) { fetchAllZZ() }

/**
 * Calls [WriteCollectionHandle.store] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 *
 * This allows multiple elements to be stored and will wait until all the operations are done.
 */
suspend fun <H : WriteCollectionHandle<T>, T> H.dispatchStore(first: T, vararg rest: T) {
    withContext(dispatcher) {
        listOf(storeZZ(first)) + rest.map { storeZZ(it) }
    }.joinAll()
    getProxy().waitForIdle()
}

/**
 * Calls [WriteCollectionHandle.remove] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 *
 * This allows multiple elements to be removed and will wait until all the operations are done.
 */
suspend fun <H : WriteCollectionHandle<T>, T> H.dispatchRemove(first: T, vararg rest: T) {
    withContext(dispatcher) {
        listOf(removeZZ(first)) + rest.map { removeZZ(it) }
    }.joinAll()
    getProxy().waitForIdle()
}

/**
 * Calls [WriteCollectionHandle.clear] with the handle's dispatcher context and waits for it to
 * complete (including notifications being sent to other handles reading from the same store).
 */
suspend fun <H : WriteCollectionHandle<T>, T> H.dispatchClear() {
    withContext(dispatcher) { clearZZ() }.join()
    getProxy().waitForIdle()
}

/** Calls [QueryCollectionHandle.query] with the handle's dispatcher context. */
suspend fun <H : QueryCollectionHandle<T, A>, T : Storable, A> H.dispatchQuery(args: A): Set<T> =
    withContext(dispatcher) { queryZZ(args) }
