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

/**
 * Mutable bi-directional map utility class.
 */
class MutableBiMap<L, R>() {
    private val left2right: MutableMap<L, R> = mutableMapOf()
    private val right2left: MutableMap<R, L> = mutableMapOf()

    val size: Int get() = left2right.size
    val entries: MutableSet<MutableMap.MutableEntry<L, R>> get() = left2right.entries
    val lefts: MutableSet<L> get() = left2right.keys
    val rights: MutableSet<R> get() = right2left.keys

    fun put(left: L, right: R) {
        if (left2right.contains(left)) {
            right2left.remove(left2right.get(left))
        }
        if (right2left.contains(right)) {
            left2right.remove(right2left.get(right))
        }

        left2right.put(left, right)
        right2left.put(right, left)
        left2right.size
    }

    fun getL(right: R): L? {
        return right2left.get(right)
    }

    fun getR(left: L): R? {
        return left2right.get(left)
    }

    fun containsL(left: L): Boolean {
        return left2right.contains(left)
    }

    fun containsR(right: R): Boolean {
        return right2left.contains(right)
    }

    fun removeL(left: L): R? {
        val right = left2right.remove(left)
        right2left.remove(right, left)
        return right
    }

    fun removeR(right: R): L? {
        val left = right2left.remove(right)
        left2right.remove(left, right)
        return left
    }

    fun clear() {
        left2right.clear()
        right2left.clear()
    }
}
