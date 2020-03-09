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

package arcs.sdk.wasm

fun <T, U> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    action: (T, U) -> Unit
) {
    val handles = listOf(handle1, handle2)
    handles.forEach { handle ->
        handle.onUpdate {
            action(handle1.getContent(), handle2.getContent())
fun<T, U> combineUpdates(
    handle1: WasmHandleEvents<T>, 
    handle2: WasmHandleEvents<U>,
    action: (T, U) -> Unit) {
        val handles = listOf(handle1, handle2)
        handles.forEach { handle ->
            handle.onUpdate {
                action(handle1.getContent(), handle2.getContent())
            }

fun <T, U> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    action: (T, U) -> Unit
) {
    val handles = listOf(handle1, handle2)
    handles.forEach { handle ->
        handle.onUpdate {
            action(handle1.getContent(), handle2.getContent())
        }
    }
}
