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

import arcs.core.common.ArcId
import arcs.core.data.Capabilities
import arcs.core.data.Schema

abstract class StorageKeyFactory(val protocol: String, val capabilities: Capabilities) {

    abstract fun create(options: StorageKeyOptions): StorageKey

    /**
     * Returns true, if the current storage key class supports the given set of [Capabilities].
     */
    fun supports(other: Capabilities): Boolean {
        return capabilities.containsAll(other)
    }

    /**
     * Options passed to registered [StorageKey] constructors.
     * @property arcId An identifier of an Arc requesting the [StorageKey]
     * @property entitySchema A schema of an entities that will be stored
     * @property unique A unique component of the [StorageKey]
     * @property location A memory location of the [StorageKey]
     */
    interface StorageKeyOptions {
        val arcId: ArcId
        val entitySchema: Schema
        val unique: String
        val location: String
    }

    data class ContainerStorageKeyOptions(
        override val arcId: ArcId,
        override val entitySchema: Schema
    ) : StorageKeyOptions {
        override val unique: String = ""
        override val location: String = arcId.toString()
    }

    data class BackingStorageKeyOptions(
        override val arcId: ArcId,
        override val entitySchema: Schema
    ) : StorageKeyOptions {
        override val unique: String = with(entitySchema.name?.name) {
            if (isNullOrEmpty()) entitySchema.hash else this as String
        }
        override val location: String = unique
    }
}
