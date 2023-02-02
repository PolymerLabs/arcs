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

import arcs.core.data.Schema
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyProtocol
import arcs.core.storage.StorageKeySpec

/*
 * ForeignStorageKey are used in external references for deletion-propagation. They just identify a
 * namespace for the reference, which is usually a Schema name of an empty schema.
 */
class ForeignStorageKey(
  val namespace: String
) : StorageKey(protocol) {

  constructor(schema: Schema) : this(checkNotNull(schema.name?.name))

  override fun toKeyString(): String = namespace

  override fun newKeyWithComponent(component: String): StorageKey {
    // Nest the given component as a child under the current key.
    return ForeignStorageKey("$namespace/$component")
  }

  companion object : StorageKeySpec<ForeignStorageKey> {
    override val protocol = StorageKeyProtocol.Foreign

    override fun parse(rawKeyString: String): ForeignStorageKey {
      return ForeignStorageKey(rawKeyString)
    }
  }
}
