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

package arcs.core.storage.keys

import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyProtocol
import arcs.core.storage.StorageKeySpec
import arcs.core.storage.StorageKeyUtils
import arcs.core.storage.embed

/** Implementation for a composite [StorageKey] for joining entities. */
class JoinStorageKey(
  val components: List<StorageKey>
) : StorageKey(protocol) {
  override fun toKeyString(): String {
    val builder = StringBuilder()
    builder.append("${components.size}/")
    components.forEach { builder.append("{${it.embed()}}") }

    return builder.toString()
  }

  override fun newKeyWithComponent(component: String): StorageKey {
    TODO("Not yet implemented for JoinStorageKey")
  }

  companion object : StorageKeySpec<JoinStorageKey> {
    /** Protocol to be used when the StorageKey is composed of multiple StorageKeys. */
    override val protocol = StorageKeyProtocol.Join
    override fun parse(rawKeyString: String): JoinStorageKey {
      val invalidFormatMessage: () -> String =
        { "Invalid format for JoinStorageKey." }

      // We will support < 10 joins.
      val numberOfJoins: Int = rawKeyString[0] - '0'
      require(numberOfJoins in 1..9, invalidFormatMessage)
      require(rawKeyString[1] == '/', invalidFormatMessage)

      val storageKeys = StorageKeyUtils.extractKeysFromString(rawKeyString.substring(2))
      require(storageKeys.size == numberOfJoins, invalidFormatMessage)
      return JoinStorageKey(storageKeys)
    }
  }
}
