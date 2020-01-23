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

import arcs.core.common.ArcId
import arcs.core.storage.DriverFactory
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RamDiskDriverProvider]. */
@RunWith(JUnit4::class)
class DatabaseDriverProviderTest {
    @After
    fun teardown() = DriverFactory.clearRegistrationsForTesting()

    @Test
    fun registersSelfWithDriverFactory() {
        DatabaseDriverProvider() // Constructor registers self.

        assertThat(DriverFactory.willSupport(DatabaseStorageKey("foo"))).isTrue()
    }

    @Test
    fun willSupport_returnsTrue_whenDatabaseKey() {
        val provider = DatabaseDriverProvider()
        val key = DatabaseStorageKey("foo")
        assertThat(provider.willSupport(key)).isTrue()
    }

    @Test
    fun willSupport_returnsFalse_whenNotDatabaseKey() {
        val provider = DatabaseDriverProvider()
        val ramdisk = RamDiskStorageKey("foo")
        val volatile = VolatileStorageKey(ArcId.newForTest("myarc"), "foo")
        val other = object : StorageKey("outofnowhere") {
            override fun toKeyString(): String = "something"
            override fun childKeyWithComponent(component: String): StorageKey = this
        }

        assertThat(provider.willSupport(ramdisk)).isFalse()
        assertThat(provider.willSupport(volatile)).isFalse()
        assertThat(provider.willSupport(other)).isFalse()
    }

    @Test(expected = IllegalArgumentException::class)
    fun getDriver_throwsOnInvalidKey() = runBlocking {
        val provider = DatabaseDriverProvider()
        val volatile = VolatileStorageKey(ArcId.newForTest("myarc"), "foo")

        provider.getDriver<Int>(volatile, ExistenceCriteria.ShouldCreate)
        Unit
    }
}
