package arcs.core.entity

import arcs.core.common.Id
import arcs.core.crdt.VersionMap
import arcs.core.data.Capability.Ttl
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.data.SchemaRegistry
import arcs.core.data.expression.asExpr
import arcs.core.data.expression.neq
import arcs.core.data.expression.text
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class StorageAdapterTest {
  private val time = FakeTime()
  private val dereferencerFactory = EntityDereferencerFactory(
    testStorageEndpointManager(),
    ForeignReferenceCheckerImpl(mapOf())
  )
  private val idGenerator = Id.Generator.newForTest("session")
  private val storageKey = DummyStorageKey("entities")

  @Before
  fun setUp() {
    SchemaRegistry.register(DummyEntity.SCHEMA)
    SchemaRegistry.register(InlineDummyEntity.SCHEMA)
  }

  @Test
  fun entityStorageAdapter() {
    val adapter = EntityStorageAdapter(
      "name",
      idGenerator,
      DummyEntity,
      Ttl.Minutes(1),
      time,
      dereferencerFactory,
      storageKey
    )
    val entity = DummyEntity().apply { text = "Watson" }

    // Convert to storage format (RawEntity).
    val rawEntity = adapter.storableToReferencable(entity)

    assertThat(entity.entityId).isNotNull()
    assertThat(rawEntity.id).isNotEqualTo(NO_REFERENCE_ID)
    assertThat(rawEntity.creationTimestamp).isEqualTo(time.currentTimeMillis)
    assertThat(rawEntity.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60000)
    assertThat(rawEntity.singletons).containsEntry("text", "Watson".toReferencable())
    assertThat(entity.serialize()).isEqualTo(rawEntity)

    // Convert back from storage format again.
    assertThat(adapter.referencableToStorable(rawEntity)).isEqualTo(entity)
  }

  @Test
  fun entityStorageAdapterRestricted() {
    val adapter = EntityStorageAdapter(
      "name",
      idGenerator,
      DummyEntity,
      Ttl.Minutes(1),
      time,
      dereferencerFactory,
      storageKey,
      RestrictedDummyEntity.SCHEMA
    )
    var entity = DummyEntity().apply {
      text = "Watson"
      num = 42.0
      bool = true
    }

    // Convert to storage format (RawEntity).
    val rawEntity = adapter.storableToReferencable(entity)

    assertThat(entity.entityId).isNotNull()
    assertThat(rawEntity.id).isNotEqualTo(NO_REFERENCE_ID)
    assertThat(rawEntity.creationTimestamp).isEqualTo(time.currentTimeMillis)
    assertThat(rawEntity.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60000)
    assertThat(rawEntity.singletons.size).isEqualTo(1)
    assertThat(rawEntity.singletons).containsEntry("text", "Watson".toReferencable())
    assertThat(entity.serialize(RestrictedDummyEntity.SCHEMA)).isEqualTo(rawEntity)

    // Convert back from storage format again.
    entity = entity.apply { num = null }.apply { bool = null }
    assertThat(adapter.referencableToStorable(rawEntity)).isEqualTo(entity)
  }

  @Test
  fun isExpiredEntity() {
    val adapter = EntityStorageAdapter(
      "name",
      idGenerator,
      DummyEntity,
      Ttl.Minutes(1),
      time,
      dereferencerFactory,
      storageKey
    )
    val entity = DummyEntity().apply { text = "Watson" }
    // This call sets the timestamps.
    val rawEntity = adapter.storableToReferencable(entity)

    assertThat(entity.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60_000)

    assertThat(adapter.isExpired(rawEntity)).isFalse()

    time.millis += 60_001

    assertThat(adapter.isExpired(rawEntity)).isTrue()
  }

  @Test
  fun entityStorageAdapter_getId() {
    val adapter = EntityStorageAdapter(
      "name",
      idGenerator,
      DummyEntity,
      Ttl.Minutes(1),
      time,
      dereferencerFactory,
      storageKey
    )
    val entity = DummyEntity().apply { text = "Watson" }
    // This assigns an ID.
    adapter.storableToReferencable(entity)

    assertThat(adapter.getId(entity)).isEqualTo(entity.entityId)
  }

  @Test
  fun entityStorageAdapter_failsRefinement() {
    val specWithRefinement: EntitySpec<DummyEntity> = object : EntitySpec<DummyEntity> {
      override fun deserialize(data: RawEntity) = DummyEntity.deserialize(data)
      override val SCHEMA =
        DummyEntity.SCHEMA.copy(refinementExpression = text("text") neq "FORBIDDEN!".asExpr())
    }
    val adapter = EntityStorageAdapter(
      "name",
      idGenerator,
      specWithRefinement,
      Ttl.Minutes(1),
      time,
      dereferencerFactory,
      storageKey
    )
    val entity = DummyEntity().apply { text = "FORBIDDEN!" }
    val exception = assertFailsWith<IllegalArgumentException> {
      adapter.storableToReferencable(entity)
    }
    assertThat(exception).hasMessageThat().startsWith(
      "Invalid entity stored to handle (failed refinement)"
    )
  }

  @Test
  fun referenceStorageAdapter() {
    val adapter = ReferenceStorageAdapter(
      DummyEntity,
      dereferencerFactory,
      Ttl.Minutes(1),
      time,
      storageKey
    )
    val storageReference = StorageReference(
      "id",
      DummyStorageKey("storage-key"),
      VersionMap("a" to 1)
    )
    val reference = Reference(DummyEntity, storageReference)

    // Convert to storage format (StorageReference).
    val referencable = adapter.storableToReferencable(reference)
    assertThat(referencable).isEqualTo(storageReference)
    assertThat(referencable.creationTimestamp).isEqualTo(time.currentTimeMillis)
    assertThat(referencable.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60000)

    // Convert back from storage format again.
    val convertBack = adapter.referencableToStorable(storageReference)
    assertThat(convertBack).isEqualTo(reference)
    assertThat(convertBack.creationTimestamp).isEqualTo(time.currentTimeMillis)
    assertThat(convertBack.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60000)
  }

  @Test
  fun isExpiredReference() {
    val adapter = ReferenceStorageAdapter(
      DummyEntity,
      dereferencerFactory,
      Ttl.Minutes(1),
      time,
      storageKey
    )
    val storageReference = StorageReference(
      "id",
      DummyStorageKey("storage-key"),
      VersionMap("a" to 1)
    )
    val reference = Reference(DummyEntity, storageReference)
    // This sets the timestamps.
    val referencable = adapter.storableToReferencable(reference)
    assertThat(reference.expirationTimestamp).isEqualTo(time.currentTimeMillis + 60_000)

    assertThat(adapter.isExpired(referencable)).isFalse()
    time.millis += 60_001
    assertThat(adapter.isExpired(referencable)).isTrue()
  }

  @Test
  fun referenceStorageAdapter_getId() {
    val adapter = ReferenceStorageAdapter(
      DummyEntity,
      dereferencerFactory,
      Ttl.Minutes(1),
      time,
      storageKey
    )
    val storageReference = StorageReference(
      "an-id",
      DummyStorageKey("storage-key"),
      VersionMap("a" to 1)
    )
    val reference = Reference(DummyEntity, storageReference)

    assertThat(adapter.getId(reference)).isEqualTo("an-id")
  }

  @Test
  fun referenceStorageAdapter_checksStorageKeys() {
    val dbKey = DatabaseStorageKey.Persistent("db", DummyEntity.SCHEMA_HASH)
    val ramdiskKey = RamDiskStorageKey("ramdsik")
    val dummyKey = DummyStorageKey("dummy")
    val dbRefMode = ReferenceModeStorageKey(dbKey, dbKey)

    // These combinations should work.
    refAdapterWithKey(dbKey).storableToReferencable(referenceWithKey(dbKey))
    refAdapterWithKey(ramdiskKey).storableToReferencable(referenceWithKey(ramdiskKey))
    refAdapterWithKey(dbKey).storableToReferencable(referenceWithKey(ramdiskKey))
    refAdapterWithKey(dummyKey).storableToReferencable(referenceWithKey(dummyKey))
    refAdapterWithKey(dbKey).storableToReferencable(referenceWithKey(dummyKey))
    refAdapterWithKey(ramdiskKey).storableToReferencable(referenceWithKey(dummyKey))
    refAdapterWithKey(dummyKey).storableToReferencable(referenceWithKey(ramdiskKey))

    // Storing in ramdisk a reference to the db.
    assertFails {
      refAdapterWithKey(ramdiskKey).storableToReferencable(referenceWithKey(dbKey))
    }

    // Storing in dummy a reference to the db.
    assertFails { refAdapterWithKey(dummyKey).storableToReferencable(referenceWithKey(dbKey)) }

    // Storing the reference in a different db.
    val dbKey2 = DatabaseStorageKey.Persistent(
      "db",
      DummyEntity.SCHEMA_HASH,
      dbName = "different"
    )
    assertFails { refAdapterWithKey(dbKey2).storableToReferencable(referenceWithKey(dbKey)) }

    // Illegal reference (points to refmode key).
    assertFailsWith<IllegalStateException> {
      refAdapterWithKey(dbKey).storableToReferencable(referenceWithKey(dbRefMode))
    }
  }

  @Test
  fun entityStorageAdapter_checksStorageKeys() {
    val dbKey = DatabaseStorageKey.Persistent("db", DummyEntity.SCHEMA_HASH)
    val ramdiskKey = RamDiskStorageKey("ramdsik")
    val dummyKey = DummyStorageKey("dummy")
    val ramdiskRefMode = ReferenceModeStorageKey(ramdiskKey, ramdiskKey)
    val dbRefMode = ReferenceModeStorageKey(dbKey, dbKey)

    // These combinations should work.
    entityStorageAdapterWithKey(dbKey).storableToReferencable(entityWithKey(dbKey))
    entityStorageAdapterWithKey(ramdiskKey).storableToReferencable(entityWithKey(ramdiskKey))
    entityStorageAdapterWithKey(dbKey).storableToReferencable(entityWithKey(ramdiskKey))
    entityStorageAdapterWithKey(dummyKey).storableToReferencable(entityWithKey(dummyKey))
    entityStorageAdapterWithKey(dbKey).storableToReferencable(entityWithKey(dummyKey))
    entityStorageAdapterWithKey(ramdiskKey).storableToReferencable(entityWithKey(dummyKey))
    entityStorageAdapterWithKey(dummyKey).storableToReferencable(entityWithKey(ramdiskKey))
    entityStorageAdapterWithKey(dbRefMode).storableToReferencable(entityWithKey(dbKey))

    // Storing in ramdisk a reference to the db.
    assertFails {
      entityStorageAdapterWithKey(ramdiskKey).storableToReferencable(entityWithKey(dbKey))
    }
    assertFails {
      entityStorageAdapterWithKey(ramdiskRefMode).storableToReferencable(entityWithKey(dbKey))
    }

    // Storing in dummy a reference to the db.
    assertFails {
      entityStorageAdapterWithKey(dummyKey).storableToReferencable(entityWithKey(dbKey))
    }

    // Storing the reference in a different db.
    val dbKey2 = DatabaseStorageKey.Persistent(
      "db",
      DummyEntity.SCHEMA_HASH,
      dbName = "different"
    )
    assertFails {
      entityStorageAdapterWithKey(dbKey2).storableToReferencable(entityWithKey(dbKey))
    }

    // Illegal reference (points to refmode key).
    assertFailsWith<IllegalStateException> {
      entityStorageAdapterWithKey(dbKey).storableToReferencable(entityWithKey(dbRefMode))
    }

    // Invalid refmode key, the container and backing store are in different dbs.
    val invalidKey = ReferenceModeStorageKey(dbKey2, dbKey)
    assertFails {
      entityStorageAdapterWithKey(invalidKey).storableToReferencable(entityWithKey(dbKey))
    }
  }

  private fun refAdapterWithKey(key: StorageKey) =
    ReferenceStorageAdapter(DummyEntity, dereferencerFactory, Ttl.Minutes(1), time, key)

  private fun entityStorageAdapterWithKey(key: StorageKey) = EntityStorageAdapter(
    "name",
    idGenerator,
    DummyEntity,
    Ttl.Minutes(1),
    time,
    dereferencerFactory,
    key
  )

  private fun referenceWithKey(key: StorageKey) = Reference(
    DummyEntity,
    StorageReference(
      "id",
      key,
      VersionMap("a" to 1)
    )
  )

  private fun entityWithKey(key: StorageKey) = DummyEntity().apply { ref = referenceWithKey(key) }

  private fun assertFails(block: () -> Unit) {
    val exception = assertFailsWith<IllegalStateException>(block = block)
    assertThat(exception).hasMessageThat().startsWith(
      "References to database entity should only be stored in the same database."
    )
  }
}
