package arcs.core.storage.api

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.TaggedLog
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [ArcsSet]. */
@Suppress("TestFunctionName")
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ArcsSetTest {
    @get:Rule
    val logRule = LogRule()

    private val log = TaggedLog { "ArcsSetTest" }
    private val backingStorageKey = RamDiskStorageKey("myBacking")
    private val directStorageKey = RamDiskStorageKey("myDirect")
    private val referenceModeStorageKey =
        ReferenceModeStorageKey(backingStorageKey, directStorageKey)
    private val personSchema = Schema(
        listOf(SchemaName("person")),
        SchemaFields(mapOf("name" to FieldType.Text, "age" to FieldType.Number), emptyMap()),
        "hash"
    )

    init {
        // Ensure the RamDiskDriver is registered.
        RamDiskDriverProvider()
    }

    @Before
    fun setup() = RamDisk.clear()

    @After
    fun teardown() = CapabilitiesResolver.reset()

    @Test
    fun canCreateSet_ofEntities() = runBlockingTest {
        val set = ArcsSet(
            referenceModeStorageKey,
            personSchema,
            coroutineContext = coroutineContext
        )
        log.debug { "Adding Bob to set" }
        set.addAsync(Person("bob", 42)).await()

        val otherSet = ArcsSet(
            referenceModeStorageKey,
            personSchema,
            coroutineContext = coroutineContext
        )
        log.debug { "Adding Sue to otherSet" }
        otherSet.addAsync(Person("sue", 32)).await()

        log.debug { "Testing for bob in otherSet" }
        assertThat(otherSet.contains(Person("bob", 42))).isTrue()
        log.debug { "Testing for sue in set" }
        assertThat(set.contains(Person("sue", 32))).isTrue()
        assertThat(set.contains(Person("larry", 21))).isFalse()
    }

    @Test
    fun canCreateSet_ofPrimitives() = runBlockingTest {
        val set = ArcsSet<Double>(
            RamDiskStorageKey("myNums"),
            ExistenceCriteria.MayExist,
            coroutineContext
        )

        assertThat(set.add(10.toReferencable())).isTrue()
        assertThat(set.add(15.toReferencable())).isTrue()

        assertThat(set.contains(10.toReferencable())).isTrue()
    }

    @Test
    fun canCreate_mutableIterator() = runBlockingTest {
        val set = ArcsSet<Double>(
            RamDiskStorageKey("mutableIterator"),
            ExistenceCriteria.ShouldCreate,
            coroutineContext
        )

        // Add a bunch of items
        val addAllDeferred = set.addAllAsync((1..10).map { it.toReferencable() })
        assertThat(addAllDeferred.await()).isEqualTo(10)

        val jobs = mutableListOf<Deferred<Boolean>>()

        val iterator = set.iterator()
        var iterated = 0
        iterator.forEach {
            if (it.value.toInt() % 2 == 0) {
                // Remove even items.
                jobs += iterator.removeAsync()
            }
            iterated++
        }
        assertThat(iterated).isEqualTo(10)

        // Wait for all of the removals to finish.
        jobs.awaitAll()

        // Make sure all even items were removed.
        (2..10).step(2).forEach {
            log.debug { "$it" }
            assertThat(set.contains(it.toReferencable())).isFalse()
        }
    }

    @Test
    fun size_isAccurate() = runBlockingTest {
        val set = ArcsSet<String>(
            RamDiskStorageKey("MyStrings"),
            coroutineContext = coroutineContext
        )

        assertThat(set.isEmpty()).isTrue()
        assertThat(set.isNotEmpty()).isFalse()
        assertThat(set.size()).isEqualTo(0)

        set.add("Hello".toReferencable())

        assertThat(set.isEmpty()).isFalse()
        assertThat(set.isNotEmpty()).isTrue()
        assertThat(set.size()).isEqualTo(1)
    }

    @Test
    fun freeze_returnsNonChangingValue() = runBlockingTest {
        val set = ArcsSet<ByteArray>(
            RamDiskStorageKey("myBytes"),
            coroutineContext = coroutineContext
        )

        val emptyFrozen = set.freeze()
        set.add("Going to become bytes.".toByteArray().toReferencable())
        val fullFrozen = set.freeze()

        assertThat(emptyFrozen).isEmpty()
        assertThat(fullFrozen).isNotEmpty()

        set.remove("Going to become bytes.".toByteArray().toReferencable())

        assertThat(fullFrozen).isNotEmpty()
    }

    private fun Person(name: String, age: Int): RawEntity =
        RawEntity(
            name,
            singletons = mapOf("name" to name.toReferencable(), "age" to age.toReferencable())
        )
}
