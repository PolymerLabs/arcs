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

package arcs.core.storage.referencemode

import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeySpec
import arcs.core.storage.StorageKeyUtils
import arcs.core.storage.embed

/**
 * Special subclass of [StorageKey] used to identify data managed by a
 * [arcs.storage.ReferenceModeStore].
 */
data class ReferenceModeStorageKey(
  val backingKey: StorageKey,
  val storageKey: StorageKey
) : StorageKey(protocol) {

  init {
    // This is a overly strict check as some combinations of different protocols are fine, so it
    // can be relaxed if needed (see [StorageAdapter] for a more precise check).
    require(backingKey.protocol == storageKey.protocol) {
      "Different protocols (${backingKey.protocol} and ${storageKey.protocol}) in a " +
        "ReferenceModeStorageKey can cause problems with garbage collection if the " +
        "backing key is in the database and the container key isn't."
    }
  }

  override fun childKeyWithComponent(component: String): StorageKey =
    ReferenceModeStorageKey(backingKey, storageKey.childKeyWithComponent(component))

  override fun toKeyString(): String = "{${backingKey.embed()}}{${storageKey.embed()}}"

  override fun toString(): String = super.toString()

  companion object : StorageKeySpec<ReferenceModeStorageKey> {
    override val protocol = "reference-mode"
    override fun parse(rawKeyString: String): ReferenceModeStorageKey {
      val invalidFormatMessage: () -> String =
        { "Invalid format for ReferenceModeStorageKey" }
      val storageKeys = StorageKeyUtils.extractKeysFromString(rawKeyString)
      require(storageKeys.size == 2, invalidFormatMessage)

      return ReferenceModeStorageKey(
        storageKeys[0],
        storageKeys[1]
      )
    }
  }
}
