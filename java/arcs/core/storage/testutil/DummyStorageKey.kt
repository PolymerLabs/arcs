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
import arcs.core.storage.StorageKeyParser

/** Fake [StorageKey] implementation for use in unit tests. */
class DummyStorageKey(val key: String) : StorageKey(protocol) {
    override fun toKeyString(): String = key

    override fun childKeyWithComponent(component: String): StorageKey = this

    companion object {
        const val protocol = "dummy"

        fun parse(rawKeyString: String): DummyStorageKey = DummyStorageKey(rawKeyString)

        fun registerParser() {
            StorageKeyParser.addParser(protocol, ::parse)
        }
    }
}
