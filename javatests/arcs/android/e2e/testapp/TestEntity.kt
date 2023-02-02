package arcs.android.e2e.testapp

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry
import arcs.core.entity.SingletonProperty
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.Entity
import arcs.sdk.EntityBase
import arcs.sdk.EntitySpec

interface TestEntitySlice : Entity {
  var text: String
  var number: Double
  var boolean: Boolean
}

class TestEntity(
  text: String = "",
  number: Double = 0.0,
  boolean: Boolean = false
) : EntityBase("TestEntity", SCHEMA), TestEntitySlice {

  override var text: String by SingletonProperty(this)
  override var number: Double by SingletonProperty(this)
  override var boolean: Boolean by SingletonProperty(this)

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
          "boolean" to FieldType.Boolean
        ),
        collections = emptyMap()
      ),
      schemaHash
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
      backingKey = DatabaseStorageKey.Persistent(
        "singleton_reference",
        "arcs_test"
      ),
      storageKey = DatabaseStorageKey.Persistent("singleton", "arcs_test")
    )

    val collectionInMemoryStorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("collection_reference"),
      storageKey = RamDiskStorageKey("collection")
    )

    val collectionPersistentStorageKey = ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Persistent(
        "collection_reference",
        "arcs_test"
      ),
      storageKey = DatabaseStorageKey.Persistent("collection", "arcs_test")
    )

    const val text = "Test Text"
    const val number = 1234.0
    const val boolean = true
  }

  enum class StorageMode {
    IN_MEMORY,
    PERSISTENT,
  }
}
