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
import arcs.core.storage.database.DatabaseFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.Random

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class AndroidSqliteDatabaseFactoryTest {
    private lateinit var factory: DatabaseFactory
    private lateinit var random: Random

    @Before
    fun setUp() {
        factory = AndroidSqliteDatabaseFactory(ApplicationProvider.getApplicationContext())
        random = Random(System.currentTimeMillis())
    }

    @Test
    fun getDatabase() = runBlockingTest {
        val database = factory.getDatabase("foo", true)
        assertThat(database).isInstanceOf(DatabaseImpl::class.java)
    }

    @Test
    fun getDatabases() = runBlockingTest {
        val databaseFoo = factory.getDatabase("foo", true)
        assertThat(databaseFoo).isInstanceOf(DatabaseImpl::class.java)

        val databaseBar = factory.getDatabase("bar", true)
        assertThat(databaseBar).isInstanceOf(DatabaseImpl::class.java)
        assertThat(databaseFoo).isNotEqualTo(databaseBar)
        assertThat(databaseFoo).isNotSameInstanceAs(databaseBar)

        val databaseFooMemory = factory.getDatabase("foo", false)
        assertThat(databaseFooMemory).isInstanceOf(DatabaseImpl::class.java)
        assertThat(databaseFoo).isNotEqualTo(databaseBar)
        assertThat(databaseFoo).isNotSameInstanceAs(databaseBar)
    }

    @Test
    fun getSameDatabase_returnsSameObject() = runBlockingTest {
        val firstFoo = factory.getDatabase("foo", true)
        val secondFoo = factory.getDatabase("foo", true)

        assertThat(firstFoo).isInstanceOf(DatabaseImpl::class.java)
        assertThat(secondFoo).isInstanceOf(DatabaseImpl::class.java)
        assertThat(firstFoo).isSameInstanceAs(secondFoo)
    }

    @Test
    fun getSameDatabase_concurrently_returnsSameObject() = runBlockingTest {
        val firstFoo = async {
            delay(random.nextInt(1000).toLong())
            factory.getDatabase("foo", true)
        }
        val secondFoo = async {
            delay(random.nextInt(1000).toLong())
            factory.getDatabase("foo", true)
        }

        assertThat(firstFoo.await()).isSameInstanceAs(secondFoo.await())
    }
}
