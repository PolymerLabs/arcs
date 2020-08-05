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
import arcs.core.entity.ReadableHandle

/**
 * Receive a callback when either handle is updated.
 *
 * @param handle1 The first handle the callback will be assigned to
 * @param handle2 The second handle the callback will be assigned to
 * @param action callback
 */

fun <T1, U1, T2, U2> combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
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

fun <T1, U1, T2, U2, T3, U3> combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
    handle3: ReadableHandle<T3, U3>,
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

fun <T1, U1, T2, U2, T3, U3, T4, U4> combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
    handle3: ReadableHandle<T3, U3>,
    handle4: ReadableHandle<T4, U4>,
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

fun <T1, U1, T2, U2, T3, U3, T4, U4, T5, U5> combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
    handle3: ReadableHandle<T3, U3>,
    handle4: ReadableHandle<T4, U4>,
    handle5: ReadableHandle<T5, U5>,
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

fun <T1, U1, T2, U2, T3, U3, T4, U4, T5, U5, T6, U6> combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
    handle3: ReadableHandle<T3, U3>,
    handle4: ReadableHandle<T4, U4>,
    handle5: ReadableHandle<T5, U5>,
    handle6: ReadableHandle<T6, U6>,
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

fun <T1, U1, T2, U2, T3, U3, T4, U4, T5, U5, T6, U6, T7, U7> combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
    handle3: ReadableHandle<T3, U3>,
    handle4: ReadableHandle<T4, U4>,
    handle5: ReadableHandle<T5, U5>,
    handle6: ReadableHandle<T6, U6>,
    handle7: ReadableHandle<T7, U7>,
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

fun <T1, U1, T2, U2, T3, U3, T4, U4, T5, U5, T6, U6, T7, U7, T8, U8> combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
    handle3: ReadableHandle<T3, U3>,
    handle4: ReadableHandle<T4, U4>,
    handle5: ReadableHandle<T5, U5>,
    handle6: ReadableHandle<T6, U6>,
    handle7: ReadableHandle<T7, U7>,
    handle8: ReadableHandle<T8, U8>,
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

fun <T1, U1, T2, U2, T3, U3, T4, U4, T5, U5, T6, U6, T7, U7, T8, U8, T9, U9> combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
    handle3: ReadableHandle<T3, U3>,
    handle4: ReadableHandle<T4, U4>,
    handle5: ReadableHandle<T5, U5>,
    handle6: ReadableHandle<T6, U6>,
    handle7: ReadableHandle<T7, U7>,
    handle8: ReadableHandle<T8, U8>,
    handle9: ReadableHandle<T9, U9>,
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

fun <T1, U1, T2, U2, T3, U3, T4, U4, T5, U5, T6, U6, T7, U7, T8, U8, T9, U9, T10, U10>
combineUpdates(
    handle1: ReadableHandle<T1, U1>,
    handle2: ReadableHandle<T2, U2>,
    handle3: ReadableHandle<T3, U3>,
    handle4: ReadableHandle<T4, U4>,
    handle5: ReadableHandle<T5, U5>,
    handle6: ReadableHandle<T6, U6>,
    handle7: ReadableHandle<T7, U7>,
    handle8: ReadableHandle<T8, U8>,
    handle9: ReadableHandle<T9, U9>,
    handle10: ReadableHandle<T10, U10>,
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
private fun <T, U> ReadableHandle<T, U>.getContent(): T =
    when (this) {
        is ReadSingletonHandle<*> -> fetch() as T
        is ReadCollectionHandle<*> -> fetchAll() as T
        else -> throw IllegalArgumentException("Unknown ReadableHandle type found")
    }
