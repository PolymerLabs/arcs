/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.storage.referencemode

import arcs.storage.StorageKey


/**
 * Special subclass of [StorageKey] used to identify data managed by a
 * [arcs.storage.ReferenceModeStore].
 */
data class ReferenceModeStorageKey(
    val backingKey: StorageKey,
    val storageKey: StorageKey
) : StorageKey(REFERENCE_MODE_PROTOCOL) {
    override fun childKeyWithComponent(component: String): StorageKey =
        ReferenceModeStorageKey(backingKey, storageKey.childKeyWithComponent(component))

    override fun toKeyString(): String = "{${backingKey.embed()}}{${storageKey.embed()}}"

    companion object {
        const val REFERENCE_MODE_PROTOCOL = "reference-mode"

        private fun StorageKey.embed() =
            toString().replace("\\{".toRegex(), "{{")
                .replace("}".toRegex(), "}}")
    }
}
