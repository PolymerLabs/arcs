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
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.type.Tag
import arcs.core.type.Type
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
    private lateinit var providerFactory: VolatileDriverProviderFactory

    @Before
    fun setup() {
        arcIdFoo = ArcId.newForTest("foo")
        arcIdBar = ArcId.newForTest("bar")
        providerFactory = VolatileDriverProviderFactory()
    }

    @After
    fun tearDown() {
        DriverFactory.clearRegistrations()
    }

    @Test
    fun constructor_registersSelfWithDriverFactory() {
        assertThat(providerFactory.arcIds).isEmpty()
        // These also cover testing the happy-path of willSupport on VolatileDriverProvider itself.
        assertThat(DriverFactory.willSupport(VolatileStorageKey(arcIdFoo, "myfoo"))).isTrue()
        assertThat(DriverFactory.willSupport(VolatileStorageKey(arcIdBar, "mybar"))).isTrue()
        assertThat(providerFactory.arcIds).isEqualTo(setOf(arcIdFoo, arcIdBar))

        // Make sure it's not returning true for just anything.
        assertThat(DriverFactory.willSupport(RamDiskStorageKey("baz"))).isFalse()
        assertThat(providerFactory.arcIds).isEqualTo(setOf(arcIdFoo, arcIdBar))
    }

    @Test
    fun willSupport_requiresVolatileStorageKey() {
        class NonVolatileKey : StorageKey("nonvolatile") {
            override fun toKeyString() = "blah"
            override fun childKeyWithComponent(component: String) = NonVolatileKey()
        }

        assertThat(providerFactory.willSupport(NonVolatileKey())).isFalse()
    }

    @Test
    fun getDriver_getsDriverForStorageKey() = runBlocking {
        val driver =
            providerFactory.getDriver(
                VolatileStorageKey(arcIdFoo, "myfoo"),
                Int::class,
                DummyType
            )

        assertThat(driver).isNotNull()
        assertThat(driver.storageKey).isEqualTo(VolatileStorageKey(arcIdFoo, "myfoo"))
    }

    companion object {
        object DummyType : Type {
            override val tag = Tag.Count
            override fun toLiteral() = throw UnsupportedOperationException("")
        }
    }
}
