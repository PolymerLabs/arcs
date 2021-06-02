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

package arcs.core.storage.driver

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtEntity.Reference.Companion.buildReference
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.crdt.toCrdtEntityData
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.testutil.RawEntitySubject.Companion.assertThat
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.RawReference
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseOp
import arcs.core.storage.database.ReferenceWithVersion
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.toReference
import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.util.testutil.LogRule
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.jvm.storage.database.testutil.FakeDatabase
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlin.reflect.KClass
import kotlin.test.assertFailsWith
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DatabaseDriverTest {

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.create()

  @get:Rule
  val logRule = LogRule()

  private lateinit var database: FakeDatabase

  @Before
  fun setUp() {
    BuildFlags.WRITE_ONLY_STORAGE_STACK = true
    database = FakeDatabase()
  }

  @Test
  fun constructor_addsDriverAsClientOfDatabase() = runBlockingTest {
    val driver = buildDriver<CrdtEntity.Data>(database)
    assertThat(database.clients[driver.clientId]?.first).isEqualTo(driver.storageKey)
    assertThat(database.clients[driver.clientId]?.second).isSameInstanceAs(driver)
  }

  @Test
  fun constructor_refModeKey_addsDriverAsClientOfDatabase() = runBlockingTest {
    val driver = buildDriver<CrdtEntity.Data>(database, REFMODE_STORAGE_KEY)
    assertThat(database.clients[driver.clientId]?.first).isEqualTo(driver.storageKey)
    assertThat(database.clients[driver.clientId]?.second).isSameInstanceAs(driver)
  }

  @Test
  fun registerReceiver_withNoData_doesNotTriggerReceiver() = runBlockingTest {
    val driver = buildDriver<CrdtEntity.Data>(database)
    var called = false
    driver.registerReceiver { _, _ -> called = true }
    assertThat(called).isFalse()
  }

  @Test
  fun registerReceiver_withData_triggersReceiver() = runBlockingTest {
    val driver = buildDriver<CrdtEntity.Data>(database)
    val entity = RawEntity(
      "jason",
      singletons = mapOf("name" to "Jason".toReferencable()),
      collections = mapOf(
        "phone_numbers" to setOf(
          RawReference(
            ReferencablePrimitive(String::class, "555-5555").id,
            driver.storageKey.newKeyWithComponent("phone_numbers"),
            VersionMap()
          )
        )
      )
    )
    database.data[driver.storageKey] = DatabaseData.Entity(
      entity,
      DEFAULT_SCHEMA,
      1,
      VersionMap()
    )

    var calledWithData: CrdtEntity.Data? = null
    var calledWithVersion: Int? = null
    driver.registerReceiver { data, version ->
      calledWithData = data
      calledWithVersion = version
    }

    assertThat(calledWithData).isEqualTo(
      entity.toCrdtEntityData(VersionMap()) {
        if (it is RawReference) it
        else buildReference(it)
      }
    )
    assertThat(calledWithVersion).isEqualTo(1)
  }

  @Test
  fun close_resetsReceiver_removesClient() = runBlockingTest {
    val fakeDb = object : FakeDatabase() {
      override suspend fun addClient(client: DatabaseClient): Int = 42
      override suspend fun removeClient(identifier: Int) {
        assertThat(identifier).isEqualTo(42)
      }
    }
    val driver = buildDriver<CrdtEntity.Data>(fakeDb)
    driver.registerReceiver { _, _ -> Unit }

    driver.close()

    assertThat(driver.receiver).isNull()
  }

  @Test
  fun send_entity() = runBlockingTest {
    val driver = buildDriver<CrdtEntity.Data>(database)

    driver.send(ENTITY, 1)

    val databaseValue = checkNotNull(database.data[driver.storageKey] as? DatabaseData.Entity)

    assertThat(databaseValue.rawEntity).isEqualTo(ENTITY.toRawEntity())
    assertThat(databaseValue.databaseVersion).isEqualTo(1)
    assertThat(databaseValue.versionMap).isEqualTo(ENTITY.versionMap)

    var receiverEntity: CrdtEntity.Data? = null
    var receiverVersion: Int? = null
    driver.registerReceiver("asdf") { data, version ->
      receiverEntity = data
      receiverVersion = version
    }
    assertThat(receiverEntity).isEqualTo(ENTITY)
    assertThat(receiverVersion).isEqualTo(1)
  }

  @Test
  fun send_singleton_withValue() = runBlockingTest {
    val driver = buildDriver<CrdtSingleton.DataImpl<RawReference>>(database)
    val singleton = ENTITY.toCrdtSingleton(driver.storageKey, VersionMap("bar" to 2))

    driver.send(singleton, 1)

    val databaseValue = checkNotNull(
      database.data[driver.storageKey] as? DatabaseData.Singleton
    )

    assertThat(databaseValue.value).isEqualTo(
      ReferenceWithVersion(ENTITY.toRawReference(driver.storageKey), VersionMap("bar" to 2))
    )
    assertThat(databaseValue.databaseVersion).isEqualTo(1)
    assertThat(databaseValue.versionMap).isEqualTo(singleton.versionMap)

    var receiverSingleton: CrdtSingleton.DataImpl<RawReference>? = null
    var receiverVersion: Int? = null
    driver.registerReceiver("asdf") { data, version ->
      receiverSingleton = data
      receiverVersion = version
    }
    assertThat(receiverSingleton).isEqualTo(singleton)
    assertThat(receiverVersion).isEqualTo(1)
  }

  @Test
  fun send_singleton_empty() = runBlockingTest {
    val driver = buildDriver<CrdtSingleton.DataImpl<RawReference>>(database)
    val entity: CrdtEntity.Data? = null
    val singleton = entity.toCrdtSingleton(driver.storageKey)

    driver.send(singleton, 1)

    val databaseValue = checkNotNull(
      database.data[driver.storageKey] as? DatabaseData.Singleton
    )

    assertThat(databaseValue.value).isNull()
    assertThat(databaseValue.databaseVersion).isEqualTo(1)
    assertThat(databaseValue.versionMap).isEqualTo(singleton.versionMap)

    var receiverSingleton: CrdtSingleton.DataImpl<RawReference>? = null
    var receiverVersion: Int? = null
    driver.registerReceiver("asdf") { data, version ->
      receiverSingleton = data
      receiverVersion = version
    }
    assertThat(receiverSingleton).isEqualTo(singleton)
    assertThat(receiverVersion).isEqualTo(1)
  }

  @Test
  fun send_set_withValues() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawReference>>(database)

    val entities = setOf(
      ENTITY,
      createPersonCrdt(
        "cameron",
        setOf("+61-4-5555-5555", "+61-4-5555-6666"),
        VersionMap("bar" to 1)
      )
    )
    val set = entities.toCrdtSet(driver.storageKey, VersionMap("other" to 2))

    driver.send(set, 1)

    val databaseValue = checkNotNull(
      database.data[driver.storageKey] as? DatabaseData.Collection
    )

    assertThat(databaseValue.values).isEqualTo(
      set.values.map { ReferenceWithVersion(it.value.value, it.value.versionMap) }.toSet()
    )
    assertThat(databaseValue.databaseVersion).isEqualTo(1)
    assertThat(databaseValue.versionMap).isEqualTo(set.versionMap)

    var receiverSet: CrdtSet.DataImpl<RawReference>? = null
    var receiverVersion: Int? = null
    driver.registerReceiver("asdf") { data, version ->
      receiverSet = data
      receiverVersion = version
    }
    assertThat(receiverSet).isEqualTo(set)
    assertThat(receiverVersion).isEqualTo(1)
  }

  @Test
  fun send_set_empty() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawReference>>(database)
    val entities = emptySet<CrdtEntity.Data>()
    val set = entities.toCrdtSet(driver.storageKey, VersionMap())

    driver.send(set, 1)

    val databaseValue = checkNotNull(
      database.data[driver.storageKey] as? DatabaseData.Collection
    )

    assertThat(databaseValue.values).isEqualTo(emptySet<ReferenceWithVersion>())
    assertThat(databaseValue.databaseVersion).isEqualTo(1)
    assertThat(databaseValue.versionMap).isEqualTo(set.versionMap)

    var receiverSet: CrdtSet.DataImpl<RawReference>? = null
    var receiverVersion: Int? = null
    driver.registerReceiver("asdf") { data, version ->
      receiverSet = data
      receiverVersion = version
    }
    assertThat(receiverSet).isEqualTo(set)
    assertThat(receiverVersion).isEqualTo(1)
  }

  @Test
  fun send_entity_fromOneDriver_heardByOther_notByOriginator() = runBlockingTest {
    val originatingDriver = buildDriver<CrdtEntity.Data>(database)
    val receivingDriver = buildDriver<CrdtEntity.Data>(database)

    var receiverEntity: CrdtEntity.Data? = null
    var receiverVersion: Int? = null
    receivingDriver.registerReceiver { data, version ->
      receiverEntity = data
      receiverVersion = version
    }
    originatingDriver.registerReceiver { _, _ ->
      fail(
        "Originator should not hear of its own change when its receiver was " +
          "registered before sending"
      )
    }

    originatingDriver.send(ENTITY, 1)

    assertThat(receiverEntity).isEqualTo(ENTITY)
    assertThat(receiverVersion).isEqualTo(1)
  }

  @Test
  fun send_singleton_fromOneDriver_heardByOther_notByOriginator() = runBlockingTest {
    val originatingDriver = buildDriver<CrdtSingleton.DataImpl<RawReference>>(database)
    val receivingDriver = buildDriver<CrdtSingleton.DataImpl<RawReference>>(database)

    val singleton = ENTITY.toCrdtSingleton(originatingDriver.storageKey)
    var receiverData: CrdtSingleton.Data<RawReference>? = null
    var receiverVersion: Int? = null
    receivingDriver.registerReceiver { data, version ->
      receiverData = data
      receiverVersion = version
    }
    originatingDriver.registerReceiver { data, version ->
      assertWithMessage(
        "Originator should only hear of the initial empty value, not its own change"
      ).that(data.values).isEmpty()
      assertThat(version).isEqualTo(-1)
    }

    originatingDriver.send(singleton, 1)

    assertThat(receiverData).isEqualTo(singleton)
    assertThat(receiverVersion).isEqualTo(1)
  }

  @Test
  fun send_set_fromOneDriver_heardByOther_notByOriginator() = runBlockingTest {
    val originatingDriver = buildDriver<CrdtSet.DataImpl<RawReference>>(database)
    val receivingDriver = buildDriver<CrdtSet.DataImpl<RawReference>>(database)

    val set = setOf(ENTITY).toCrdtSet(originatingDriver.storageKey)
    var receiverData: CrdtSet.Data<RawReference>? = null
    var receiverVersion: Int? = null
    receivingDriver.registerReceiver { data, version ->
      receiverData = data
      receiverVersion = version
    }
    originatingDriver.registerReceiver { data, version ->
      assertWithMessage(
        "Originator should only hear of the initial empty value, not its own change"
      ).that(data.values).isEmpty()
      assertThat(version).isEqualTo(-1)
    }

    originatingDriver.send(set, 1)

    assertThat(receiverData).isEqualTo(set)
    assertThat(receiverVersion).isEqualTo(1)
  }

  @Test
  fun applyOps_add_dbKey() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database, DEFAULT_STORAGE_KEY)
    val rawEntity = ENTITY.toRawEntity("id")
    val op = CrdtSet.Operation.Add("", VersionMap(), rawEntity)

    driver.applyOps(listOf(op))

    assertThat(database.ops[DEFAULT_STORAGE_KEY]).containsExactly(
      DatabaseOp.AddToCollection(
        rawEntity.toReference(DEFAULT_STORAGE_KEY, VersionMap()),
        DEFAULT_SCHEMA
      )
    )
    val entityKey = DEFAULT_STORAGE_KEY.newKeyWithComponent("id")
    val databaseValue = checkNotNull(database.data[entityKey] as? DatabaseData.Entity)
    assertThat(databaseValue.rawEntity).isEqualTo(rawEntity)
    assertThat(databaseValue.databaseVersion).isEqualTo(1)
    assertThat(databaseValue.versionMap).isEqualTo(DatabaseDriver.ENTITIES_VERSION_MAP)
  }

  @Test
  fun applyOps_add_refModeKey() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database, REFMODE_STORAGE_KEY)
    val rawEntity = ENTITY.toRawEntity("id")
    val op = CrdtSet.Operation.Add("", VersionMap(), rawEntity)

    driver.applyOps(listOf(op))

    assertThat(database.ops[REFMODE_STORAGE_KEY.storageKey]).containsExactly(
      DatabaseOp.AddToCollection(
        rawEntity.toReference(REFMODE_STORAGE_KEY.backingKey, VersionMap()),
        DEFAULT_SCHEMA
      )
    )
    val entityKey = REFMODE_STORAGE_KEY.backingKey.newKeyWithComponent("id")
    val databaseValue = checkNotNull(database.data[entityKey] as? DatabaseData.Entity)
    assertThat(databaseValue.rawEntity).isEqualTo(rawEntity)
    assertThat(databaseValue.databaseVersion).isEqualTo(1)
    assertThat(databaseValue.versionMap).isEqualTo(DatabaseDriver.ENTITIES_VERSION_MAP)
  }

  @Test
  fun applyOps_remove_dbKey() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database, DEFAULT_STORAGE_KEY)
    val op = CrdtSet.Operation.Remove<RawEntity>("", VersionMap(), "id")

    driver.applyOps(listOf(op))

    assertThat(database.ops[DEFAULT_STORAGE_KEY]).containsExactly(
      DatabaseOp.RemoveFromCollection("id", DEFAULT_SCHEMA)
    )
  }

  @Test
  fun applyOps_remove_refModeKey() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database, REFMODE_STORAGE_KEY)
    val op = CrdtSet.Operation.Remove<RawEntity>("", VersionMap(), "id")

    driver.applyOps(listOf(op))

    assertThat(database.ops[REFMODE_STORAGE_KEY.storageKey]).containsExactly(
      DatabaseOp.RemoveFromCollection("id", DEFAULT_SCHEMA)
    )
  }

  @Test
  fun applyOps_clear_dbKey() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database, DEFAULT_STORAGE_KEY)
    val op = CrdtSet.Operation.Clear<RawEntity>("", VersionMap())

    driver.applyOps(listOf(op))

    assertThat(database.ops[DEFAULT_STORAGE_KEY]).containsExactly(
      DatabaseOp.ClearCollection(DEFAULT_SCHEMA)
    )
  }

  @Test
  fun applyOps_clear_refModeKey() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database, REFMODE_STORAGE_KEY)
    val op = CrdtSet.Operation.Clear<RawEntity>("", VersionMap())

    driver.applyOps(listOf(op))

    assertThat(database.ops[REFMODE_STORAGE_KEY.storageKey]).containsExactly(
      DatabaseOp.ClearCollection(DEFAULT_SCHEMA)
    )
  }

  @Test
  fun applyOps_multipleOps() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database, DEFAULT_STORAGE_KEY)
    val rawEntity = ENTITY.toRawEntity("id")
    val op1 = CrdtSet.Operation.Clear<RawEntity>("", VersionMap())
    val op2 = CrdtSet.Operation.Remove<RawEntity>("", VersionMap(), "id")
    val op3 = CrdtSet.Operation.Add("", VersionMap(), rawEntity)

    driver.applyOps(listOf(op1, op2, op3))

    assertThat(database.ops[DEFAULT_STORAGE_KEY]).containsExactly(
      DatabaseOp.ClearCollection(DEFAULT_SCHEMA),
      DatabaseOp.RemoveFromCollection("id", DEFAULT_SCHEMA),
      DatabaseOp.AddToCollection(
        rawEntity.toReference(DEFAULT_STORAGE_KEY, VersionMap()),
        DEFAULT_SCHEMA
      )
    )
    val databaseValue = checkNotNull(
      database.data[DEFAULT_STORAGE_KEY.newKeyWithComponent("id")]
        as? DatabaseData.Entity
    )
    assertThat(databaseValue.rawEntity).isEqualTo(rawEntity)
    assertThat(databaseValue.databaseVersion).isEqualTo(1)
    assertThat(databaseValue.versionMap).isEqualTo(DatabaseDriver.ENTITIES_VERSION_MAP)
  }

  @Test
  fun applyOps_singletonOp_throws() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database)
    val op = CrdtSingleton.Operation.Clear<RawEntity>("", VersionMap())

    assertFailsWith<IllegalArgumentException> {
      driver.applyOps(listOf(op))
    }.also {
      assertThat(it).hasMessageThat().startsWith("Only CrdtSet operations are supported")
    }
  }

  @Test
  fun applyOps_referenceOp_throws() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database)
    val op = CrdtSet.Operation.Add("", VersionMap(), ENTITY.toRawReference(driver.storageKey))

    assertFailsWith<IllegalArgumentException> {
      driver.applyOps(listOf(op))
    }.also {
      assertThat(it).hasMessageThat().startsWith("Only CrdtSet.IOperation<RawEntity> are supported")
    }
  }

  @Test
  fun applyOps_fastForward_throws() = runBlockingTest {
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database)
    val op = CrdtSet.Operation.FastForward(
      VersionMap("actor" to 1),
      VersionMap("actor" to 2),
      removed = mutableListOf(ENTITY.toRawEntity())
    )

    assertFailsWith<UnsupportedOperationException> {
      driver.applyOps(listOf(op))
    }.also {
      assertThat(it).hasMessageThat().startsWith("Unsupported operation FastForward")
    }
  }

  @Test
  fun applyOps_flagDisabled_throwsException() = runBlockingTest {
    BuildFlags.WRITE_ONLY_STORAGE_STACK = false
    val driver = buildDriver<CrdtSet.DataImpl<RawEntity>>(database)
    val op = CrdtSingleton.Operation.Clear<RawEntity>("", VersionMap())

    assertFailsWith<BuildFlagDisabledError> {
      driver.applyOps(listOf(op))
    }
  }

  @Test
  fun deletedAtDatabase_heardByDriver() = runBlockingTest {
    val driver = buildDriver<CrdtEntity.Data>(database)
    var receiverData: CrdtEntity.Data? = null

    driver.send(ENTITY, 1)
    driver.registerReceiver { data, _ -> receiverData = data }

    assertThat(receiverData).isNotNull()

    receiverData = null
    database.delete(driver.storageKey)

    driver.registerReceiver { data, _ -> receiverData = data }

    assertThat(receiverData).isNull()
  }

  @Test
  fun cloneCreates_newInstance() = runBlockingTest {
    val driver = buildDriver<CrdtEntity.Data>(database)
    assertThat(driver.clone()).isNotSameInstanceAs(driver)
  }

  @Test
  fun clonedDriver_seesChanges_fromOriginal() = runBlockingTest {
    val driver = buildDriver<CrdtEntity.Data>(database)
    val clone = driver.clone()

    var receiverData: CrdtEntity.Data? = null
    var receiverVersion: Int? = null

    clone.registerReceiver { data, version ->
      receiverData = data
      receiverVersion = version
    }

    driver.send(ENTITY, 1)

    assertThat(receiverData).isEqualTo(ENTITY)
    assertThat(receiverVersion).isEqualTo(1)
  }

  class DriverBuilder<Data : Any>(
    var dataClass: KClass<Data>,
    var type: Type,
    var database: Database,
    var storageKey: StorageKey = DEFAULT_STORAGE_KEY,
    var schema: Schema
  ) {
    suspend fun build() = DatabaseDriver(storageKey, dataClass, schema, database).register()
  }

  private suspend inline fun <reified Data : Any> buildDriver(
    database: Database,
    storageKey: StorageKey = DEFAULT_STORAGE_KEY,
    schema: Schema = DEFAULT_SCHEMA,
    crossinline block: DriverBuilder<Data>.() -> Unit = {}
  ): DatabaseDriver<Data> {
    return buildDriver(database, Data::class, storageKey, schema) { this.block() }
  }

  private suspend fun <Data : Any> buildDriver(
    database: Database,
    dataClass: KClass<Data>,
    storageKey: StorageKey,
    schema: Schema,
    block: DriverBuilder<Data>.() -> Unit = {}
  ): DatabaseDriver<Data> {
    val typeTag = when (dataClass) {
      CrdtEntity.Data::class -> Tag.Entity
      CrdtSingleton.DataImpl::class -> Tag.Singleton
      CrdtSet.DataImpl::class -> Tag.Collection
      else -> throw IllegalArgumentException("Unsupported Data class $dataClass")
    }
    val type = object : Type {
      override val tag = typeTag
    }
    return DriverBuilder(dataClass, type, database, storageKey, schema).apply(block).build()
  }

  companion object {
    private val DEFAULT_STORAGE_KEY = DatabaseStorageKey.Persistent(
      unique = "foo",
      dbName = "testdb"
    )
    private val REFMODE_STORAGE_KEY = ReferenceModeStorageKey(
      DatabaseStorageKey.Persistent(
        unique = "backing",
        dbName = "testdb"
      ),
      DEFAULT_STORAGE_KEY
    )
    private val DEFAULT_SCHEMA = Schema(
      setOf(SchemaName("foo")),
      SchemaFields(
        singletons = mapOf("name" to FieldType.Text),
        collections = mapOf("phone_numbers" to FieldType.Text)
      ),
      "bar"
    )

    private val ENTITY = createPersonCrdt("jason", setOf("+1-919-555-5555"), VersionMap("foo" to 1))

    private fun createPersonCrdt(
      name: String,
      phoneNumbers: Set<String>,
      versionMap: VersionMap = VersionMap()
    ): CrdtEntity.Data = CrdtEntity.Data(
      versionMap,
      RawEntity(
        singletons = mapOf("name" to name.toReferencable()),
        collections = mapOf(
          "phone_numbers" to phoneNumbers.map { it.toReferencable() }.toSet()
        )
      )
    ) {
      buildReference(it)
    }

    private fun Set<CrdtEntity.Data>.toCrdtSet(
      baseKey: StorageKey,
      versionMap: VersionMap = VersionMap()
    ): CrdtSet.DataImpl<RawReference> = CrdtSet.DataImpl(
      versionMap,
      this.map { it.toRawReference(baseKey) }
        .associate { it.id to CrdtSet.DataValue(versionMap, it) }
        .toMutableMap()
    )

    private fun CrdtEntity.Data?.toCrdtSingleton(
      baseKey: StorageKey,
      versionMap: VersionMap = VersionMap()
    ): CrdtSingleton.DataImpl<RawReference> = CrdtSingleton.DataImpl(
      versionMap,
      this?.let {
        val reference = it.toRawReference(baseKey)
        mutableMapOf(
          reference.id to CrdtSet.DataValue(versionMap, reference)
        )
      } ?: mutableMapOf()
    )

    private fun CrdtEntity.Data.toRawReference(baseKey: StorageKey): RawReference {
      val id = hashCode().toString()
      return RawReference(id, baseKey.newKeyWithComponent(id), versionMap)
    }
  }
}
