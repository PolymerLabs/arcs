package arcs.storage.api

import arcs.arcs.storage.api.ArcsSet
import arcs.arcs.util.TaggedLog
import arcs.arcs.util.testutil.initLogForTest
import arcs.common.ReferenceId
import arcs.data.RawEntity
import arcs.data.Schema
import arcs.data.SchemaDescription
import arcs.data.SchemaFields
import arcs.data.SchemaName
import arcs.data.util.toReferencable
import arcs.storage.driver.RamDiskDriverProvider
import arcs.storage.driver.RamDiskStorageKey
import arcs.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.coroutines.coroutineContext

/** Tests for [ArcsSet]. */
@Suppress("TestFunctionName")
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ArcsSetTest {
    private val log = TaggedLog { "ArcsSetTest" }
    private val backingStorageKey = RamDiskStorageKey("myBacking")
    private val directStorageKey = RamDiskStorageKey("myDirect")
    private val referenceModeStorageKey = ReferenceModeStorageKey(backingStorageKey, directStorageKey)
    private val personSchema = Schema(
        listOf(SchemaName("person")),
        SchemaFields(setOf("name", "age"), emptySet()),
        SchemaDescription()
    )

    init { initLogForTest() }

    @Before
    fun setup() {
        RamDiskDriverProvider()
    }

    @Test
    fun canCreateSet_ofEntities() = runBlocking {
        val set = ArcsSet(referenceModeStorageKey, personSchema)
        set.addAsync(Person("bob", 42)).await()

        val otherSet = ArcsSet(referenceModeStorageKey, personSchema)
        otherSet.addAsync(Person("sue", 32)).await()

        assertThat(otherSet.contains(Person("bob", 42))).isTrue()

        try {
            set.close()
            otherSet.close()
        } catch (e: Exception) {}
    }

    private fun Person(name: String, age: Int): RawEntity =
        RawEntity(
            name,
            singletons = mapOf("name" to name.toReferencable(), "age" to age.toReferencable())
        )
}