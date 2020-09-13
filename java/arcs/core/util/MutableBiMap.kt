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
package arcs.core.util

import kotlinx.coroutines.sync.Mutex

/**
 * Thread-safe mutable bi-directional map utility class.
 */
class MutableBiMap<L, R>() {
    private val left2right: MutableMap<L, R> = mutableMapOf()
    private val right2left: MutableMap<R, L> = mutableMapOf()
    private val mutex: Mutex = Mutex()

    fun put(left: L, right: R) {
        while (!mutex.tryLock()) { /* Wait. */ }
        if (left2right.contains(left)) {
            right2left.remove(left2right.get(left))
        }
        if (right2left.contains(right)) {
            left2right.remove(right2left.get(right))
        }
        left2right.put(left, right)
        right2left.put(right, left)
        mutex.unlock()
    }

    fun getL(right: R): L? {
        while (!mutex.tryLock()) { /* Wait. */ }
        val left = right2left.get(right)
        mutex.unlock()
        return left
    }

    fun getR(left: L): R? {
        while (!mutex.tryLock()) { /* Wait. */ }
        val right = left2right.get(left)
        mutex.unlock()
        return right
    }

    fun containsL(left: L): Boolean {
        while (!mutex.tryLock()) { /* Wait. */ }
        val hasLeft = left2right.contains(left)
        mutex.unlock()
        return hasLeft
    }

    fun containsR(right: R): Boolean {
        while (!mutex.tryLock()) { /* Wait. */ }
        val hasRight = right2left.contains(right)
        mutex.unlock()
        return hasRight
    }

    fun remove(left: L, right: R): Boolean {
        while (!mutex.tryLock()) { /* Wait. */ }
        var successfulRemove = false

        // Ensure left is mapped to right
        val actualRight = left2right.get(left)
        val actualLeft = right2left.get(right)
        if (actualRight == right && actualLeft == left) {
            successfulRemove = left2right.remove(left, right) && right2left.remove(right, left)
        }

        mutex.unlock()
        return successfulRemove
    }

    fun removeL(left: L): R? {
        while (!mutex.tryLock()) { /* Wait. */ }
        val right = left2right.remove(left)
        right2left.remove(right, left)
        mutex.unlock()
        return right
    }

    fun removeR(right: R): L? {
        while (!mutex.tryLock()) { /* Wait. */ }
        val left = right2left.remove(right)
        left2right.remove(left, right)
        mutex.unlock()
        return left
    }

    fun clear() {
        while (!mutex.tryLock()) { /* Wait. */ }
        left2right.clear()
        right2left.clear()
        mutex.unlock()
    }

    fun entries(): MutableSet<MutableMap.MutableEntry<L, R>> {
        while (!mutex.tryLock()) { /* Wait. */ }
        val left2rightEntries = left2right.entries
        mutex.unlock()
        return left2rightEntries
    }

    fun lefts(): MutableSet<L> {
        while (!mutex.tryLock()) { /* Wait. */ }
        val leftKeys = left2right.keys
        mutex.unlock()
        return leftKeys
    }

    fun rights(): MutableSet<R> {
        while (!mutex.tryLock()) { /* Wait. */ }
        val rightKeys = right2left.keys
        mutex.unlock()
        return rightKeys
    }

    fun count(): Int {
        while (!mutex.tryLock()) { /* Wait. */ }
        val size = left2right.size
        mutex.unlock()
        return size
    }
}
