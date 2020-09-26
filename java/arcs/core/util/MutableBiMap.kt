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

  /**
   * Returns the number of [L]/[R] pairs in the map.
   */
  val size: Int get() = left2right.size

  /**
   * Returns a [Set] of all [L]/[R] pairs in this bi-directional map.
   */
  val entries: Set<Map.Entry<L, R>> get() = left2right.entries

  /**
   * Returns a [Set] of all [L] values in this bi-directional map.
   */
  val lefts: Set<L> get() = left2right.keys

  /**
   * Returns a [Set] of all [R] values in this bi-directional map.
   */
  val rights: Set<R> get() = right2left.keys

  /**
   * Associates the specified [L] value with the specified [R] value in the bi-directional map.
   */
  fun put(left: L, right: R) {
    if (left2right.contains(left)) {
      right2left.remove(left2right.get(left))
    }
    if (right2left.contains(right)) {
      left2right.remove(right2left.get(right))
    }

    left2right.put(left, right)
    right2left.put(right, left)
  }

  /**
   * Returns the [L] value corresponding to the given [R] value, or `null` if the [R] value is not
   * present in the bi-directional map.
   */
  fun getL(right: R): L? {
    return right2left.get(right)
  }

  /**
   * Returns the [R] value corresponding to the given [L] value, or `null` if the [L] value is not
   * present in the bi-directional map.
   */
  fun getR(left: L): R? {
    return left2right.get(left)
  }

  /**
   * Returns `true` if the bi-directional map contains the specified [L] value.
   */
  fun containsL(left: L): Boolean {
    return left2right.contains(left)
  }

  /**
   * Returns `true` if the bi-directional map contains the specified [R] value.
   */
  fun containsR(right: R): Boolean {
    return right2left.contains(right)
  }

  /**
   * Removes the specified [L] value and its corresponding [R] value from this bi-directional map.
   *
   * @return the previous [R] value associated with the [L] value, or `null` if the [L] value was
   * not present in the bi-directional map.
   */
  fun removeL(left: L): R? {
    val right = left2right.remove(left)
    right2left.remove(right)
    return right
  }

  /**
   * Removes the specified [R] value and its corresponding [L] value from this bi-directional map.
   *
   * @return the previous [L] value associated with the [R] value, or `null` if the [R] value was
   * not present in the bi-directional map.
   */
  fun removeR(right: R): L? {
    val left = right2left.remove(right)
    left2right.remove(left)
    return left
  }

  /**
   * Removes all elements from this bi-directional map.
   */
  fun clear() {
    left2right.clear()
    right2left.clear()
  }
}
