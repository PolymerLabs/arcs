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

package arcs.core.storage.testutil

import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.StorageKeyProtocol

/** Fake [StorageKey] implementation for use in unit tests. */
class DummyStorageKey(val key: String) : StorageKey(protocol) {
  init {
    StorageKeyManager.GLOBAL_INSTANCE.addParser(DummyStorageKey)
  }

  override fun toKeyString(): String = key

  override fun childKeyWithComponent(component: String): StorageKey =
    DummyStorageKey("$key/$component")

  companion object : StorageKeyParser<DummyStorageKey> {
    override val protocol = StorageKeyProtocol.Dummy
    override fun parse(rawKeyString: String) = DummyStorageKey(rawKeyString)
  }
}
