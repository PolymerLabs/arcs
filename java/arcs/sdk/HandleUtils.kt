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
 * @param handle1 The first handle the callback will be assigned to
 * @param handle2 The second handle the callback will be assigned to
 * @param action callback
 */
suspend fun <T1, T2> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
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

suspend fun <T1, T2, T3> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
    handle3: ReadableHandle<T3>,
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

suspend fun <T1, T2, T3, T4> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
    handle3: ReadableHandle<T3>,
    handle4: ReadableHandle<T4>,
    action: (T1, T2, T3, T4) -> Unit
) {
    val handles = listOf(handle1, handle2, handle3, handle4)
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            val e3 = handle3.getContent()
            val e4 = handle4.getContent()
            action(e1, e2, e3, e4)
        }
    }
}

suspend fun <T1, T2, T3, T4, T5> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
    handle3: ReadableHandle<T3>,
    handle4: ReadableHandle<T4>,
    handle5: ReadableHandle<T5>,
    action: (T1, T2, T3, T4, T5) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5
    )
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            val e3 = handle3.getContent()
            val e4 = handle4.getContent()
            val e5 = handle5.getContent()
            action(e1, e2, e3, e4, e5)
        }
    }
}

suspend fun <T1, T2, T3, T4, T5, T6> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
    handle3: ReadableHandle<T3>,
    handle4: ReadableHandle<T4>,
    handle5: ReadableHandle<T5>,
    handle6: ReadableHandle<T6>,
    action: (T1, T2, T3, T4, T5, T6) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6
    )
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            val e3 = handle3.getContent()
            val e4 = handle4.getContent()
            val e5 = handle5.getContent()
            val e6 = handle6.getContent()
            action(e1, e2, e3, e4, e5, e6)
        }
    }
}

suspend fun <T1, T2, T3, T4, T5, T6, T7> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
    handle3: ReadableHandle<T3>,
    handle4: ReadableHandle<T4>,
    handle5: ReadableHandle<T5>,
    handle6: ReadableHandle<T6>,
    handle7: ReadableHandle<T7>,
    action: (T1, T2, T3, T4, T5, T6, T7) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6,
        handle7
    )
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            val e3 = handle3.getContent()
            val e4 = handle4.getContent()
            val e5 = handle5.getContent()
            val e6 = handle6.getContent()
            val e7 = handle7.getContent()
            action(e1, e2, e3, e4, e5, e6, e7)
        }
    }
}

suspend fun <T1, T2, T3, T4, T5, T6, T7, T8> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
    handle3: ReadableHandle<T3>,
    handle4: ReadableHandle<T4>,
    handle5: ReadableHandle<T5>,
    handle6: ReadableHandle<T6>,
    handle7: ReadableHandle<T7>,
    handle8: ReadableHandle<T8>,
    action: (T1, T2, T3, T4, T5, T6, T7, T8) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6,
        handle7,
        handle8
    )
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            val e3 = handle3.getContent()
            val e4 = handle4.getContent()
            val e5 = handle5.getContent()
            val e6 = handle6.getContent()
            val e7 = handle7.getContent()
            val e8 = handle8.getContent()
            action(e1, e2, e3, e4, e5, e6, e7, e8)
        }
    }
}

suspend fun <T1, T2, T3, T4, T5, T6, T7, T8, T9> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
    handle3: ReadableHandle<T3>,
    handle4: ReadableHandle<T4>,
    handle5: ReadableHandle<T5>,
    handle6: ReadableHandle<T6>,
    handle7: ReadableHandle<T7>,
    handle8: ReadableHandle<T8>,
    handle9: ReadableHandle<T9>,
    action: (T1, T2, T3, T4, T5, T6, T7, T8, T9) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6,
        handle7,
        handle8,
        handle9
    )
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            val e3 = handle3.getContent()
            val e4 = handle4.getContent()
            val e5 = handle5.getContent()
            val e6 = handle6.getContent()
            val e7 = handle7.getContent()
            val e8 = handle8.getContent()
            val e9 = handle9.getContent()
            action(e1, e2, e3, e4, e5, e6, e7, e8, e9)
        }
    }
}

suspend fun <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10> combineUpdates(
    handle1: ReadableHandle<T1>,
    handle2: ReadableHandle<T2>,
    handle3: ReadableHandle<T3>,
    handle4: ReadableHandle<T4>,
    handle5: ReadableHandle<T5>,
    handle6: ReadableHandle<T6>,
    handle7: ReadableHandle<T7>,
    handle8: ReadableHandle<T8>,
    handle9: ReadableHandle<T9>,
    handle10: ReadableHandle<T10>,
    action: (T1, T2, T3, T4, T5, T6, T7, T8, T9, T10) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6,
        handle7,
        handle8,
        handle9,
        handle10
    )
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent()
            val e2 = handle2.getContent()
            val e3 = handle3.getContent()
            val e4 = handle4.getContent()
            val e5 = handle5.getContent()
            val e6 = handle6.getContent()
            val e7 = handle7.getContent()
            val e8 = handle8.getContent()
            val e9 = handle9.getContent()
            val e10 = handle10.getContent()
            action(e1, e2, e3, e4, e5, e6, e7, e8, e9, e10)
        }
    }
}

@Suppress("UNCHECKED_CAST")
private suspend fun <T> ReadableHandle<T>.getContent(): T =
    when (this) {
        is ReadWriteSingletonHandle<*> -> fetch() as T
        is ReadSingletonHandle<*> -> fetch() as T
        is ReadWriteCollectionHandle<*> -> fetchAll() as T
        is ReadCollectionHandle<*> -> fetchAll() as T
        else -> throw IllegalArgumentException("Unknown ReadableHandle type found")
    }
