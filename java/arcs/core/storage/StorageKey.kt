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

package arcs.core.storage

/** Locator for a specific piece of data within the storage layer. */
abstract class StorageKey(val protocol: String) {
  val childKeyForArcInfo: StorageKey
    get() = childKeyWithComponent("arc-info")

  abstract fun toKeyString(): String

  abstract fun childKeyWithComponent(component: String): StorageKey

  fun childKeyForHandle(handleId: String): StorageKey =
    childKeyWithComponent("handle/$handleId")

  override fun toString(): String = "$protocol://${toKeyString()}"

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (other == null || other::class != this::class) return false
    return toString() == other.toString()
  }

  override fun hashCode() = toString().hashCode()
}

/**
 * This describes the metadata related to a [StorageKey] type. The [companion] object of a
 * [StorageKey] implementation should implement this interface.
 */
interface StorageKeySpec<T : StorageKey> : StorageKeyParser<T>
