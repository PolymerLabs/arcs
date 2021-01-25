package arcs.core.storage.testutil

import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StorageKeyManagerImpl
import arcs.core.storage.StorageKeyParser

/**
 * Implementation of [StorageKeyManager] that only parses [DummyStorageKey]. Does not allow parsers
 * to be changed at all.
 */
class DummyStorageKeyManager : StorageKeyManagerImpl(DummyStorageKey) {
  override fun addParser(parser: StorageKeyParser<*>) {
    throw UnsupportedOperationException("You can't add new parsers to ${this::class}.")
  }

  override fun reset(vararg initialSet: StorageKeyParser<*>) {
    throw UnsupportedOperationException("You can't reset the parsers in ${this::class}.")
  }
}
