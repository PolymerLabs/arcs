package arcs.core.storage.api

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Log
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [ArcsSingleton]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ArcsSingletonTest {
    @get:Rule
    val logRule = LogRule()

    private val primitiveKey = RamDiskStorageKey("myThinger")
    private val entityKey =
        ReferenceModeStorageKey(RamDiskStorageKey("singleton"), RamDiskStorageKey("entity"))
    private val personSchema =
        Schema(
            listOf(SchemaName("person")),
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
                collections = emptyMap()
            ),
            "hash"
        )

    init {
        RamDiskDriverProvider()
    }

    @After
    fun teardown() {
        RamDisk.clear()
        CapabilitiesResolver.reset()
    }

    @Test
    fun canCreate_singletonOfEntity() = runBlockingTest {
        val bestFriend = ArcsSingleton(entityKey, personSchema, coroutineContext = coroutineContext)
        assertThat(bestFriend.fetch()).isNull()

        assertThat(bestFriend.store(Person("Larry", 32))).isTrue()
        assertThat(bestFriend.fetch()).isEqualTo(Person("Larry", 32))

        assertThat(bestFriend.store(Person("Sergey", 44))).isTrue()
        assertThat(bestFriend.fetch()).isEqualTo(Person("Sergey", 44))

        assertThat(bestFriend.clear()).isTrue()
        assertThat(bestFriend.fetch()).isNull() // #foreveralone
    }

    @Test
    fun canCreate_singletonOfPrimitive() = runBlockingTest {
        val favoriteColor = ArcsSingleton<String>(primitiveKey, coroutineContext = coroutineContext)
        assertThat(favoriteColor.fetch()).isNull()

        assertThat(favoriteColor.store("Blue".toReferencable())).isTrue()
        assertThat(favoriteColor.fetch()).isEqualTo("Blue".toReferencable())

        assertThat(favoriteColor.store("Red".toReferencable())).isTrue()
        assertThat(favoriteColor.fetch()).isEqualTo("Red".toReferencable())

        assertThat(favoriteColor.clear()).isTrue()
        assertThat(favoriteColor.fetch()).isNull()
    }

    @Test
    fun reflectsOperations_toStore() = runBlockingTest {
        val bob = ArcsSingleton(entityKey, personSchema, coroutineContext = coroutineContext)
        Log.debug { "Bob's Actor: ${bob.actor}" }
        val otherBob = ArcsSingleton(entityKey, personSchema, coroutineContext = coroutineContext)
        Log.debug { "OtherBob's Actor: ${otherBob.actor}" }

        // Both start out null
        assertThat(bob.getAsync().await()).isNull()
        assertThat(otherBob.getAsync().await()).isNull()

        // Setting bob's value should be reflected in otherBob.
        assertThat(bob.storeAsync(Person("bob", 42)).await()).isTrue()
        assertThat(otherBob.fetch()).isEqualTo(Person("bob", 42))

        // Updating otherBob should also be reflected in bob.
        assertThat(otherBob.storeAsync(Person("notbob", 44)).await()).isTrue()
        assertThat(bob.fetch()).isEqualTo(Person("notbob", 44))

        // Clearing bob, should result in otherBob also being cleared.
        assertThat(bob.clearAsync().await()).isTrue()

        assertThat(bob.fetch()).isNull()
        assertThat(otherBob.getAsync().await()).isNull()
    }

    @Suppress("TestFunctionName")
    private fun Person(name: String, age: Int): RawEntity =
        RawEntity(
            name,
            mapOf("name" to name.toReferencable(), "age" to age.toReferencable()),
            emptyMap()
        )
}
