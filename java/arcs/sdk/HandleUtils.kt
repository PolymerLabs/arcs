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
package arcs.sdk

import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.ReadableHandle

/**
 * Receive a callback when either handle is updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @action callback
 */
suspend fun <T1, T2> combineUpdates(
    handle1: ReadableHandle<T1, *>,
    handle2: ReadableHandle<T2, *>,
    action: (T1, T2) -> Unit
) {
    val handles = listOf(handle1, handle2)
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            action(e1, e2)
        }
    }
}

/**
 * Receive a callback when either handle is updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @action callback
 */
suspend fun <T1, T2, T3> combineUpdates(
    handle1: ReadableHandle<T1, *>,
    handle2: ReadableHandle<T2, *>,
    handle3: ReadableHandle<T3, *>,
    action: (T1, T2, T3) -> Unit
) {
    val handles = listOf(handle1, handle2, handle3)
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            val e3 = handle3.getContent()
            action(e1, e2, e3)
        }
    }
}

@Suppress("UNCHECKED_CAST")
private suspend fun <T, E : Entity> ReadableHandle<T, E>.getContent(): T =
    when (this) {
        is ReadWriteSingletonHandle<*> -> fetch() as T
        is ReadSingletonHandle<*> -> fetch() as T
        is ReadWriteCollectionHandle<*> -> fetchAll() as T
        is ReadCollectionHandle<*> -> fetchAll() as T
        else -> throw IllegalArgumentException("Unknown ReadableHandle type found")
    }
