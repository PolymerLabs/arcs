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

package arcs.sdk.storage

import arcs.core.storage.StorageKeyManager

/**
 * Represents a location in Arcs' storage system where an [Entity], [Collection], [Singleton], or a
 * region of any of those items can be found.
 */
@Suppress("EXPERIMENTAL_FEATURE_WARNING")
inline class StorageKey(val raw: String) {
  /** Converts this SDK [StorageKey] into a core [arcs.core.storage.StorageKey]. */
  /* internal */
  fun toCoreStorageKey(): arcs.core.storage.StorageKey {
    return StorageKeyManager.GLOBAL_INSTANCE.parse(raw)
  }
}
