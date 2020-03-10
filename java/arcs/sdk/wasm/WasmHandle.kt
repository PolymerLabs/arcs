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

/** Base [Handle] implementation for WASM. */
abstract class WasmHandle(
    val name: String,
    val particle: WasmParticleImpl
) {

    init {
        particle.registerHandle(this)
    }

    abstract fun sync(encoded: ByteArray)
    abstract fun update(added: ByteArray, removed: ByteArray)
}

abstract class WasmHandleEvents<T>(
    particle: WasmParticleImpl,
    name: String
) : WasmHandle(name, particle) {
    protected val onUpdateActions: MutableList<(T) -> Unit> = mutableListOf()

    /** Assign a function to be called when the handle is updated. */
    fun onUpdate(action: (T) -> Unit) {
        onUpdateActions.add(action)
    }

    /**
     * This allows combineUpdates to get the entit(ies) the handle points to by providing a
     * consistent API. This is required as Singletons have fetch() while Collections have
     * fetchAll().
     */
    protected abstract fun getContent(): T

    // Note, this method is internal to the class so that getContent() can be protected,.
    /**
     * Internal combineUpdates method.
     *
     * @handle2 Handle that we want to track updates of
     * @action Callback function
     *
     */
    fun <U> combineUpdates(
        handle2: WasmHandleEvents<U>,
        action: (T, U) -> Unit
    ) {
        val handles = listOf(this, handle2)
        handles.forEach { handle ->
            handle.onUpdate {
                action(getContent(), handle2.getContent())
            }
        }
    }
}

/**
 * Receive a callback when either handle is updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @action callback
 */
fun <T, U> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    action: (T, U) -> Unit
) {
    handle1.combineUpdates(handle2, action)
}
