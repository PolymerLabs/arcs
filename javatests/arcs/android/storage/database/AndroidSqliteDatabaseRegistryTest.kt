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

package arcs.android.storage.database

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.common.forSingleResult
import arcs.core.storage.database.DatabaseRegistration
import arcs.core.util.Time
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant

@RunWith(AndroidJUnit4::class)
class AndroidSqliteDatabaseRegistryTest {
    private lateinit var time: TestTime
    private lateinit var manifest: AndroidSqliteDatabaseRegistry

    @Before
    fun setUp() {
        time = TestTime()
        manifest = AndroidSqliteDatabaseRegistry(ApplicationProvider.getApplicationContext(), time)
    }

    @Test
    fun registration_doesNotAddNonPersistent_toDatabase() {
        val registered = manifest.register("foo", false)
        assertThat(registered.isPersistent).isFalse()

        val countInDatabase = manifest.readableDatabase.rawQuery(
            "SELECT count(*) FROM arcs_databases", emptyArray()
        ).forSingleResult { it.getInt(0) }

        assertThat(countInDatabase).isEqualTo(0)
        assertThat(manifest.fetchAll()).containsExactly(registered)
    }

    @Test
    fun registration_addsPersistent_toDatabase() {
        val registered = manifest.register("foo", true)
        assertThat(registered.isPersistent).isTrue()

        val countInDatabase = manifest.readableDatabase.rawQuery(
            "SELECT count(*) FROM arcs_databases", emptyArray()
        ).forSingleResult { it.getInt(0) }

        val valueInDatabase = manifest.readableDatabase.rawQuery(
            "SELECT name, created, last_accessed FROM arcs_databases WHERE name = ?",
            arrayOf("foo")
        ).forSingleResult {
            DatabaseRegistration(
                name = it.getString(0),
                isPersistent = true,
                created = it.getLong(1),
                lastAccessed = it.getLong(2)
            )
        }

        assertThat(countInDatabase).isEqualTo(1)
        assertThat(valueInDatabase).isEqualTo(registered)
        assertThat(manifest.fetchAll()).containsExactly(registered)
    }

    @Test
    fun registration_updatesExisting_nonPersistent_lastAccessed() {
        val registered = manifest.register("foo", false)
        assertThat(registered.isPersistent).isFalse()

        Thread.sleep(50)

        val registeredAgain = manifest.register("foo", false)

        assertThat(registeredAgain.name).isEqualTo(registered.name)
        assertThat(registeredAgain.isPersistent).isEqualTo(registered.isPersistent)
        assertThat(registeredAgain.created).isEqualTo(registered.created)
        assertThat(registeredAgain.lastAccessed).isGreaterThan(registered.lastAccessed)

        assertThat(manifest.fetchAll()).containsExactly(registeredAgain)
    }

    @Test
    fun registration_updatesExisting_persistent_lastAccessed() {
        val registered = manifest.register("foo", true)
        assertThat(registered.isPersistent).isTrue()

        Thread.sleep(50)

        val registeredAgain = manifest.register("foo", true)

        assertThat(registeredAgain.name).isEqualTo(registered.name)
        assertThat(registeredAgain.isPersistent).isEqualTo(registered.isPersistent)
        assertThat(registeredAgain.created).isEqualTo(registered.created)
        assertThat(registeredAgain.lastAccessed).isGreaterThan(registered.lastAccessed)

        assertThat(manifest.fetchAll()).containsExactly(registeredAgain)

        val countInDb = manifest.readableDatabase.rawQuery(
            "SELECT count(*) FROM arcs_databases",
            emptyArray()
        ).forSingleResult { it.getInt(0) }
        assertThat(countInDb).isEqualTo(1)
    }

    @Test
    fun fetchAll_fetches_bothPersistent_andNonpersistent() {
        val foo = manifest.register("foo", true)
        val bar = manifest.register("bar", false)
        val baz = manifest.register("baz", true)
        val cog = manifest.register("cog", false)

        assertThat(manifest.fetchAll()).containsExactly(foo, bar, baz, cog)
    }

    @Test
    fun fetchAllCreatedIn_fetchesBothPersistent_andNonPersistent_withinTimeRange() {
        time.overrideMillis = 1000L
        val foo = manifest.register("foo", true)
        val bar = manifest.register("bar", false)

        time.overrideMillis = 2000L
        val baz = manifest.register("baz", true)
        val cog = manifest.register("cog", false)

        assertThat(manifest.fetchAllCreatedIn(500L..1500L))
            .containsExactly(foo, bar)

        assertThat(manifest.fetchAllCreatedIn(1500L..2500L))
            .containsExactly(baz, cog)

        assertThat(manifest.fetchAllCreatedIn(0L..2500L))
            .containsExactly(foo, bar, baz, cog)
    }

    @Test
    fun fetchAllAccessedIn_fetchesBothPersistent_andNonPersistent_withinTimeRange() {
        // Pre-register so they have older created timestamps.
        time.overrideMillis = 0L
        manifest.register("foo", true)
        manifest.register("bar", false)
        manifest.register("baz", true)
        manifest.register("cog", false)

        // Register again, so only the lastAccessed timestamps are updated.
        time.overrideMillis = 1000L
        val foo = manifest.register("foo", true)
        val bar = manifest.register("bar", false)

        time.overrideMillis = 2000L
        val baz = manifest.register("baz", true)
        val cog = manifest.register("cog", false)

        assertThat(manifest.fetchAllAccessedIn(500L..1500L))
            .containsExactly(foo, bar)

        assertThat(manifest.fetchAllAccessedIn(1500L..2500L))
            .containsExactly(baz, cog)

        assertThat(manifest.fetchAllAccessedIn(0L..2500L))
            .containsExactly(foo, bar, baz, cog)
    }

    class TestTime : Time() {
        var overrideMillis: Long? = null

        override val nanoTime: Long
            get() = overrideMillis?.let { it * 1000000 } ?: System.nanoTime()
        override val currentTimeMillis: Long
            get() = overrideMillis ?: Instant.now().toEpochMilli()
    }
}
