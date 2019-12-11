package arcs.core.storage.api

import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Log
import arcs.core.util.testutil.initLogForTest
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [ArcsSingleton]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ArcsSingletonTest {
    private val primitiveKey = RamDiskStorageKey("myThinger")
    private val entityKey =
        ReferenceModeStorageKey(RamDiskStorageKey("singleton"), RamDiskStorageKey("entity"))
    private val personSchema =
        Schema(
            listOf(SchemaName("person")),
            SchemaFields(setOf("name", "age"), emptySet()),
            SchemaDescription()
        )

    init {
        initLogForTest()
        RamDiskDriverProvider()
    }

    @After
    fun teardown() = RamDisk.clear()

    @Test
    fun canCreate_singletonOfEntity() = runBlockingTest {
        val bestFriend = ArcsSingleton(entityKey, personSchema, coroutineContext = coroutineContext)
        assertThat(bestFriend.get()).isNull()

        assertThat(bestFriend.set(Person("Larry", 32))).isTrue()
        assertThat(bestFriend.get()).isEqualTo(Person("Larry", 32))

        assertThat(bestFriend.set(Person("Sergey", 44))).isTrue()
        assertThat(bestFriend.get()).isEqualTo(Person("Sergey", 44))

        assertThat(bestFriend.clear()).isTrue()
        assertThat(bestFriend.get()).isNull() // #foreveralone
    }

    @Test
    fun canCreate_singletonOfPrimitive() = runBlockingTest {
        val favoriteColor = ArcsSingleton<String>(primitiveKey, coroutineContext = coroutineContext)
        assertThat(favoriteColor.get()).isNull()

        assertThat(favoriteColor.set("Blue".toReferencable())).isTrue()
        assertThat(favoriteColor.get()).isEqualTo("Blue".toReferencable())

        assertThat(favoriteColor.set("Red".toReferencable())).isTrue()
        assertThat(favoriteColor.get()).isEqualTo("Red".toReferencable())

        assertThat(favoriteColor.clear()).isTrue()
        assertThat(favoriteColor.get()).isNull()
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
        assertThat(bob.setAsync(Person("bob", 42)).await()).isTrue()
        assertThat(otherBob.get()).isEqualTo(Person("bob", 42))

        // Updating otherBob should also be reflected in bob.
        assertThat(otherBob.setAsync(Person("notbob", 44)).await()).isTrue()
        assertThat(bob.get()).isEqualTo(Person("notbob", 44))

        // Clearing bob, should result in otherBob also being cleared.
        assertThat(bob.clearAsync().await()).isTrue()

        assertThat(bob.get()).isNull()
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
