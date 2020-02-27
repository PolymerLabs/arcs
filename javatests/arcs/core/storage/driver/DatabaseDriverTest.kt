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
import arcs.core.crdt.extension.toCrdtEntityData
import arcs.core.crdt.extension.toEntity
import arcs.core.data.Entity
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseData
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.testutil.LogRule
import arcs.jvm.storage.database.testutil.MockDatabase
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.reflect.KClass

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DatabaseDriverTest {
    @get:Rule
    val logRule = LogRule()

    private lateinit var database: MockDatabase

    @Before
    fun setUp() {
        database = MockDatabase()
    }

    @Test
    fun constructor_addsDriverAsClientOfDatabase() = runBlockingTest {
        val driver = buildDriver<CrdtEntity.Data>(database)
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
        val entity = Entity(
            "jason",
            DEFAULT_SCHEMA,
            mutableMapOf(
                "name" to "Jason",
                "phone_numbers" to setOf(
                    Reference(
                        ReferencablePrimitive(String::class, "555-5555").id,
                        driver.storageKey.childKeyWithComponent("phone_numbers"),
                        VersionMap()
                    )
                )
            )
        )
        database.data[driver.storageKey] = DatabaseData.Entity(entity, 1, VersionMap())

        var calledWithData: CrdtEntity.Data? = null
        var calledWithVersion: Int? = null
        driver.registerReceiver { data, version ->
            calledWithData = data
            calledWithVersion = version
        }

        assertThat(calledWithData).isEqualTo(entity.toCrdtEntityData(VersionMap()))
        assertThat(calledWithVersion).isEqualTo(1)
    }

    @Test
    fun send_throws_ifSchemaNotFound() = runBlockingTest {
        val driver = buildDriver<CrdtEntity.Data>(database) {
            schema = null
        }

        val entity = createPersonCrdt("jason", setOf("555-5555"))

        val e = assertSuspendingThrows(IllegalStateException::class) {
            driver.send(entity, 1)
        }
        assertThat(e).hasMessageThat().contains("Schema not found")
    }

    @Test
    fun send_entity() = runBlockingTest {
        val driver = buildDriver<CrdtEntity.Data>(database)
        val entity = createPersonCrdt("jason", setOf("555-5555"))

        driver.send(entity, 1)

        val databaseValue = checkNotNull(database.data[driver.storageKey] as? DatabaseData.Entity)

        assertThat(databaseValue.entity).isEqualTo(entity.toEntity(DEFAULT_SCHEMA))
        assertThat(databaseValue.databaseVersion).isEqualTo(1)
        assertThat(databaseValue.versionMap).isEqualTo(entity.versionMap)

        var receiverEntity: CrdtEntity.Data? = null
        var receiverVersion: Int? = null
        driver.registerReceiver("asdf") { data, version ->
            receiverEntity = data
            receiverVersion = version
        }
        assertThat(receiverEntity).isEqualTo(entity)
        assertThat(receiverVersion).isEqualTo(1)
    }

    @Test
    fun send_singleton_withValue() = runBlockingTest {
        val driver = buildDriver<CrdtSingleton.DataImpl<Reference>>(database)
        val entity = createPersonCrdt("jason", setOf("555-5555", "555-5556"))
        val singleton = entity.toCrdtSingleton(driver.storageKey)

        driver.send(singleton, 1)

        val databaseValue = checkNotNull(
            database.data[driver.storageKey] as? DatabaseData.Singleton
        )

        assertThat(databaseValue.reference).isEqualTo(entity.toReference(driver.storageKey))
        assertThat(databaseValue.databaseVersion).isEqualTo(1)
        assertThat(databaseValue.versionMap).isEqualTo(singleton.versionMap)

        var receiverSingleton: CrdtSingleton.DataImpl<Reference>? = null
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
        val driver = buildDriver<CrdtSingleton.DataImpl<Reference>>(database)
        val entity: CrdtEntity.Data? = null
        val singleton = entity.toCrdtSingleton(driver.storageKey)

        driver.send(singleton, 1)

        val databaseValue = checkNotNull(
            database.data[driver.storageKey] as? DatabaseData.Singleton
        )

        assertThat(databaseValue.reference).isNull()
        assertThat(databaseValue.databaseVersion).isEqualTo(1)
        assertThat(databaseValue.versionMap).isEqualTo(singleton.versionMap)

        var receiverSingleton: CrdtSingleton.DataImpl<Reference>? = null
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
        val driver = buildDriver<CrdtSet.DataImpl<Reference>>(database)

        val entities = setOf(
            createPersonCrdt("jason", setOf("+1-919-555-5555"), VersionMap("foo" to 1)),
            createPersonCrdt(
                "cameron",
                setOf("+61-4-5555-5555", "+61-4-5555-6666"),
                VersionMap("bar" to 1)
            )
        )
        val set = entities.toCrdtSet(driver.storageKey, VersionMap("foo" to 1, "bar" to 1))

        driver.send(set, 1)

        val databaseValue = checkNotNull(
            database.data[driver.storageKey] as? DatabaseData.Collection
        )

        assertThat(databaseValue.values).isEqualTo(set.values.map { it.value.value }.toSet())
        assertThat(databaseValue.databaseVersion).isEqualTo(1)
        assertThat(databaseValue.versionMap).isEqualTo(set.versionMap)

        var receiverSet: CrdtSet.DataImpl<Reference>? = null
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
        val driver = buildDriver<CrdtSet.DataImpl<Reference>>(database)
        val entities = emptySet<CrdtEntity.Data>()
        val set = entities.toCrdtSet(driver.storageKey, VersionMap())

        driver.send(set, 1)

        val databaseValue = checkNotNull(
            database.data[driver.storageKey] as? DatabaseData.Collection
        )

        assertThat(databaseValue.values).isEqualTo(set.values.map { it.value.value }.toSet())
        assertThat(databaseValue.databaseVersion).isEqualTo(1)
        assertThat(databaseValue.versionMap).isEqualTo(set.versionMap)

        var receiverSet: CrdtSet.DataImpl<Reference>? = null
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

        val entity = createPersonCrdt("jason", setOf("555-5555"))
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

        originatingDriver.send(entity, 1)

        assertThat(receiverEntity).isEqualTo(entity)
        assertThat(receiverVersion).isEqualTo(1)
    }

    @Test
    fun send_singleton_fromOneDriver_heardByOther_notByOriginator() = runBlockingTest {
        val originatingDriver = buildDriver<CrdtSingleton.DataImpl<Reference>>(database)
        val receivingDriver = buildDriver<CrdtSingleton.DataImpl<Reference>>(database)

        val entity = createPersonCrdt("jason", setOf("555-5555"))
        val singleton = entity.toCrdtSingleton(originatingDriver.storageKey)
        var receiverData: CrdtSingleton.Data<Reference>? = null
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
        val originatingDriver = buildDriver<CrdtSet.DataImpl<Reference>>(database)
        val receivingDriver = buildDriver<CrdtSet.DataImpl<Reference>>(database)

        val entity = createPersonCrdt("jason", setOf("555-5555"))
        val set = setOf(entity).toCrdtSet(originatingDriver.storageKey)
        var receiverData: CrdtSet.Data<Reference>? = null
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
    fun deletedAtDatabase_heardByDriver() = runBlockingTest {
        val driver = buildDriver<CrdtEntity.Data>(database)
        val entity = createPersonCrdt("jason",  setOf("555-5555"))

        driver.send(entity, 1)

        assertThat(driver.getLocalData()).isNotNull()

        database.delete(driver.storageKey)

        assertThat(driver.getLocalData()).isNull()
    }

    class DriverBuilder<Data : Any>(
        var dataClass: KClass<Data>,
        var database: Database,
        var existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
        var storageKey: DatabaseStorageKey = DEFAULT_STORAGE_KEY,
        var schemaLookup: (String) -> Schema? = { DEFAULT_SCHEMA }
    ) {
        var schema: Schema?
            get() = schemaLookup("whatever")
            set(value) { schemaLookup = createSchemaLookup(value) }

        suspend fun build(): DatabaseDriver<Data> =
            DatabaseDriver(storageKey, existenceCriteria, dataClass, schemaLookup, database)
                .register()

        companion object {
            private fun createSchemaLookup(schema: Schema?): (String) -> Schema? = { schema }
        }
    }

    suspend inline fun <reified Data : Any> buildDriver(
        database: Database,
        crossinline block: DriverBuilder<Data>.() -> Unit = {}
    ) = buildDriver(database, Data::class) { this.block() }

    suspend fun <Data : Any> buildDriver(
        database: Database,
        dataClass: KClass<Data>,
        block: DriverBuilder<Data>.() -> Unit = {}
    ) = DriverBuilder(dataClass, database).apply(block).build()

    companion object {
        private val DEFAULT_STORAGE_KEY = DatabaseStorageKey.Persistent(
            unique = "foo",
            entitySchemaHash = "a1234",
            dbName = "testdb"
        )
        private val DEFAULT_SCHEMA = Schema(
            listOf(SchemaName("foo")),
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = mapOf("phone_numbers" to FieldType.Text)
            ),
            "bar"
        )

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
        ): CrdtSet.DataImpl<Reference> = CrdtSet.DataImpl(
            versionMap,
            this.map { it.toReference(baseKey) }
                .associate { it.id to CrdtSet.DataValue(requireNotNull(it.version), it) }
                .toMutableMap()
        )

        private fun CrdtEntity.Data?.toCrdtSingleton(
            baseKey: StorageKey,
            versionMap: VersionMap = VersionMap()
        ): CrdtSingleton.DataImpl<Reference> = CrdtSingleton.DataImpl(
            versionMap,
            this?.let {
                val reference = it.toReference(baseKey)
                mutableMapOf(
                    reference.id to CrdtSet.DataValue(requireNotNull(reference.version), reference)
                )
            } ?: mutableMapOf()
        )

        private fun CrdtEntity.Data.toReference(baseKey: StorageKey): Reference {
            val id = hashCode().toString()
            return Reference(id, baseKey.childKeyWithComponent(id), versionMap)
        }
    }
}
