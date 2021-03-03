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
import arcs.core.storage.RawReference
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.EntityBase
import arcs.sdk.EntitySpec

class TestEntity(
  text: String = "",
  number: Double = 0.0,
  boolean: Boolean = false,
  inlineText: String = "",
  var rawReference: RawReference? = null,
  val id: String? = null
) : EntityBase("TestEntity", SCHEMA, id) {

  var text: String by SingletonProperty()
  var number: Double by SingletonProperty()
  var boolean: Boolean by SingletonProperty()
  var inlineEntity: InlineTestEntity by SingletonProperty()

  init {
    this.text = text
    this.number = number
    this.boolean = boolean
    this.inlineEntity = InlineTestEntity(inlineText)
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
          "inlineEntity" to FieldType.InlineEntity(InlineTestEntity.SCHEMA_HASH),
          "reference" to FieldType.EntityRef(schemaHash)
        ),
        collections = emptyMap()
      ),
      schemaHash
    )

    init {
      SchemaRegistry.register(SCHEMA)
    }

    override fun deserialize(data: RawEntity) = TestEntity().apply {
      deserialize(
        data,
        mapOf(
          schemaHash to TestEntity,
          InlineTestEntity.SCHEMA_HASH to InlineTestEntity
        )
      )
    }

    val singletonInMemoryStorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("singleton_reference"),
      storageKey = RamDiskStorageKey("singleton")
    )

    val singletonMemoryDatabaseStorageKey = ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Memory(
        "singleton_reference",
        schemaHash,
        "arcs_test"
      ),
      storageKey = DatabaseStorageKey.Memory("singleton", schemaHash, "arcs_test")
    )

    val singletonPersistentStorageKey = ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Persistent(
        "singleton_reference",
        schemaHash,
        "arcs_test"
      ),
      storageKey = DatabaseStorageKey.Persistent("singleton", schemaHash, "arcs_test")
    )

    val collectionInMemoryStorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("collection_reference"),
      storageKey = RamDiskStorageKey("collection")
    )

    val collectionMemoryDatabaseStorageKey = ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Memory(
        "collection_reference",
        schemaHash,
        "arcs_test"
      ),
      storageKey = DatabaseStorageKey.Memory("collection", schemaHash, "arcs_test")
    )

    val collectionPersistentStorageKey = ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Persistent(
        "collection_reference",
        schemaHash,
        "arcs_test"
      ),
      storageKey = DatabaseStorageKey.Persistent("collection", schemaHash, "arcs_test")
    )

    val clearEntitiesMemoryDatabaseStorageKey = ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Memory(
        "cleared_entities_backing",
        schemaHash,
        "arcs_test"
      ),
      storageKey = DatabaseStorageKey.Memory(
        "cleared_entities_container",
        schemaHash,
        "arcs_test"
      )
    )

    val clearEntitiesPersistentStorageKey = ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Persistent(
        "cleared_entities_backing",
        schemaHash,
        "arcs_test"
      ),
      storageKey = DatabaseStorageKey.Persistent(
        "cleared_entities_container",
        schemaHash,
        "arcs_test"
      )
    )

    const val text = "Test Text"
    const val number = 1234.0
    const val boolean = true
  }

  enum class StorageMode {
    IN_MEMORY, PERSISTENT, MEMORY_DATABASE
  }
}

class InlineTestEntity(
  text: String = ""
) : EntityBase(ENTITY_CLASS_NAME, SCHEMA, isInlineEntity = true) {
  var text: String? by SingletonProperty()

  init {
    this.text = text
  }

  companion object : EntitySpec<InlineTestEntity> {
    const val ENTITY_CLASS_NAME = "InlineTestEntity"
    const val SCHEMA_HASH = "inline_abcdef"

    override val SCHEMA = Schema(
      names = setOf(SchemaName(ENTITY_CLASS_NAME)),
      fields = SchemaFields(
        singletons = mapOf(
          "text" to FieldType.Text
        ),
        collections = emptyMap()
      ),
      hash = SCHEMA_HASH
    )

    init {
      SchemaRegistry.register(SCHEMA)
    }

    override fun deserialize(data: RawEntity) = InlineTestEntity().apply { deserialize(data) }
  }
}
