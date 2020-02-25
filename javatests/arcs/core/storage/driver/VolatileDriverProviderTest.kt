/*
 * Copyright 2019 Google LLC.
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
import arcs.core.storage.StorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileDriverProvider]. */
@RunWith(JUnit4::class)
class VolatileDriverProviderTest {
    private lateinit var arcIdFoo: ArcId
    private lateinit var arcIdBar: ArcId
    private lateinit var fooProvider: VolatileDriverProvider
    private lateinit var barProvider: VolatileDriverProvider

    @Before
    fun setup() {
        arcIdFoo = ArcId.newForTest("foo")
        arcIdBar = ArcId.newForTest("bar")
        fooProvider = VolatileDriverProvider(arcIdFoo)
        barProvider = VolatileDriverProvider(arcIdBar)
    }

    @After
    fun tearDown() {
        DriverFactory.clearRegistrationsForTesting()
    }

    @Test
    fun constructor_registersSelfWithDriverFactory() {
        // These also cover testing the happy-path of willSupport on VolatileDriverProvider itself.
        assertThat(DriverFactory.willSupport(VolatileStorageKey(arcIdFoo, "myfoo"))).isTrue()
        assertThat(DriverFactory.willSupport(VolatileStorageKey(arcIdBar, "mybar"))).isTrue()

        // Make sure it's not returning true for just anything.
        assertThat(
            DriverFactory.willSupport(VolatileStorageKey(ArcId.newForTest("baz"), "myBaz"))
        ).isFalse()
    }

    @Test
    fun willSupport_requiresVolatileStorageKey() {
        class NonVolatileKey : StorageKey("nonvolatile") {
            override fun toKeyString() = "blah"
            override fun childKeyWithComponent(component: String) = NonVolatileKey()
        }

        assertThat(fooProvider.willSupport(NonVolatileKey())).isFalse()
    }

    @Test
    fun willSupport_requiresArcIdMatch() {
        assertThat(fooProvider.willSupport(VolatileStorageKey(arcIdBar, "mybar"))).isFalse()
    }

    @Test
    fun getDriver_getsDriverForStorageKey() = runBlocking {
        val driver =
            fooProvider.getDriver(
                VolatileStorageKey(arcIdFoo, "myfoo"),
                Int::class
            )

        assertThat(driver).isNotNull()
        assertThat(driver.storageKey).isEqualTo(VolatileStorageKey(arcIdFoo, "myfoo"))
    }
}
