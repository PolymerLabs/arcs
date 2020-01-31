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
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.database.Database
import arcs.core.storage.driver.DatabaseDriverTest.DriverBuilder.Companion.buildDriver
import arcs.core.util.testutil.LogRule
import arcs.jvm.storage.database.testutil.MockDatabase
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runBlockingTest
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

    private class DriverBuilder<Data : Any> private constructor(
        var dataClass: KClass<Data>,
        var database: Database,
        var existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
        var storageKey: DatabaseStorageKey = DEFAULT_STORAGE_KEY,
        var schemaLookup: (String) -> Schema? = { DEFAULT_SCHEMA }
    ) {
        var schema: Schema?
            get() = schemaLookup("whatever")
            set(value) { schemaLookup = createSchemaLookup(value) }

        fun build(): DatabaseDriver<Data> =
            DatabaseDriver(storageKey, existenceCriteria, dataClass, schemaLookup, database)

        companion object {
            inline fun <reified Data : Any> buildDriver(
                database: Database,
                noinline block: DriverBuilder<Data>.() -> Unit = {}
            ) = buildDriver(database, Data::class, block)

            fun <Data : Any> buildDriver(
                database: Database,
                dataClass: KClass<Data>,
                block: DriverBuilder<Data>.() -> Unit = {}
            ) = DriverBuilder(dataClass, database).apply(block).build()

            private fun createSchemaLookup(schema: Schema?): (String) -> Schema? = { schema }
        }
    }

    companion object {
        private val DEFAULT_STORAGE_KEY = DatabaseStorageKey(
            unique = "foo",
            entitySchemaHash = "a1234",
            persistent = true,
            dbName = "testdb"
        )
        private val DEFAULT_SCHEMA = Schema(
            listOf(SchemaName("foo")),
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = mapOf("phone_numbers" to FieldType.Text)
            ),
            SchemaDescription(),
            "bar"
        )
    }
}
