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

package arcs.android.systemhealth.testapp

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry
import arcs.core.storage.Reference
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.EntityBase
import arcs.sdk.EntitySpec

class TestEntity(
    text: String = "",
    number: Double = 0.0,
    boolean: Boolean = false,
    val reference: Reference? = null,
    val id: String? = null
) : EntityBase("TestEntity", SCHEMA, id) {

    var text: String by SingletonProperty()
    var number: Double by SingletonProperty()
    var boolean: Boolean by SingletonProperty()

    init {
        this.text = text
        this.number = number
        this.boolean = boolean
    }

    companion object : EntitySpec<TestEntity> {

        private const val schemaHash = "abcdef"

        override val SCHEMA = Schema(
            setOf(SchemaName("TestEntity")),
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "number" to FieldType.Number,
                    "boolean" to FieldType.Boolean,
                    "reference" to FieldType.EntityRef(schemaHash)
                ),
                collections = emptyMap()
            ),
            schemaHash,
            refinement = { _ -> true },
            query = null
        )

        init {
            SchemaRegistry.register(SCHEMA)
        }

        override fun deserialize(data: RawEntity) = TestEntity().apply { deserialize(data) }

        val singletonInMemoryStorageKey = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("singleton_reference"),
            storageKey = RamDiskStorageKey("singleton")
        )

        val singletonPersistentStorageKey = ReferenceModeStorageKey(
            backingKey = DatabaseStorageKey.Persistent("singleton_reference", schemaHash, "arcs_test"),
            storageKey = DatabaseStorageKey.Persistent("singleton", schemaHash, "arcs_test")
        )

        val collectionInMemoryStorageKey = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("collection_reference"),
            storageKey = RamDiskStorageKey("collection")
        )

        val collectionPersistentStorageKey = ReferenceModeStorageKey(
            backingKey = DatabaseStorageKey.Persistent("collection_reference", schemaHash, "arcs_test"),
            storageKey = DatabaseStorageKey.Persistent("collection", schemaHash, "arcs_test")
        )

        const val text = "Test Text"
        const val number = 1234.0
        const val boolean = true
    }

    enum class StorageMode {
        IN_MEMORY, PERSISTENT
    }
}
