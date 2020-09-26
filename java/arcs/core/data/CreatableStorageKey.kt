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
package arcs.core.data

import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeySpec

/**
 * This class represents a storage key in a compiled [Plan] with 'create' fate.
 */
data class CreatableStorageKey(
  val nameFromManifest: String
) : StorageKey(protocol) {

  override fun toKeyString() = nameFromManifest

  override fun childKeyWithComponent(component: String): StorageKey {
    throw UnsupportedOperationException("CreatableStorageKey is used as a placeholder only.")
  }

  override fun toString(): String = super.toString()

  companion object : StorageKeySpec<CreatableStorageKey> {
    override val protocol = "create"

    private val CREATABLE_STORAGE_KEY_PATTERN =
      ("^([^:^?]*)\$").toRegex()

    override fun parse(rawKeyString: String): CreatableStorageKey {
      val match =
        requireNotNull(CREATABLE_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
          "Not a valid CreatableStorageKey"
        }
      return CreatableStorageKey(match.groupValues[1])
    }
  }
}
