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

package arcs.android.host

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import arcs.android.sdk.host.toComponentName
import arcs.core.allocator.Allocator
import arcs.core.common.ArcId
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.VolatileStorageKey
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric

@RunWith(AndroidJUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class AndroidAllocatorTest {
    private lateinit var recipePersonStorageKey: StorageKey
    private lateinit var context: Context
    private lateinit var readingService: TestReadingExternalHostService
    private lateinit var writingService: TestWritingExternalHostService
    private lateinit var allocator: Allocator
    private lateinit var hostRegistry: AndroidManifestHostRegistry
    private lateinit var readPersonHandleConnectionSpec: HandleConnectionSpec
    private lateinit var writePersonHandleConnectionSpec: HandleConnectionSpec
    private lateinit var writePersonParticleSpec: ParticleSpec
    private lateinit var readPersonParticleSpec: ParticleSpec
    private lateinit var writeAndReadPersonPlan: Plan
    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        SchemaDescription(),
        "42"
    )
    private var personEntityType: Type = EntityType(personSchema)

    @Before
    fun setUp() = runBlocking {
        readingService = Robolectric.setupService(TestReadingExternalHostService::class.java)
        writingService = Robolectric.setupService(TestWritingExternalHostService::class.java)

        context = InstrumentationRegistry.getInstrumentation().targetContext
        hostRegistry =
            AndroidManifestHostRegistry.createForTest(context) {
                val readingComponentName =
                    TestReadingExternalHostService::class.toComponentName(context)
                if (it.component?.equals(readingComponentName) == true) {
                    readingService.onStartCommand(it, 0, 0)
                } else {
                    val writingComponentName =
                        TestWritingExternalHostService::class.toComponentName(context)
                    if (it.component?.equals(writingComponentName) == true) {
                        writingService.onStartCommand(it, 0, 0)
                    }
                }
            }
        allocator = Allocator(hostRegistry)

        recipePersonStorageKey = VolatileStorageKey(ArcId.newForTest("foo"), "foo")
        writePersonHandleConnectionSpec =
            HandleConnectionSpec(recipePersonStorageKey, personEntityType)

        writePersonParticleSpec =
            ParticleSpec(
                "WritePerson",
                TestWritingExternalHostService.WritePerson::class.java.getCanonicalName()!!,
                mapOf("person" to writePersonHandleConnectionSpec)
            )

        readPersonHandleConnectionSpec =
            HandleConnectionSpec(recipePersonStorageKey, personEntityType)

        readPersonParticleSpec =
            ParticleSpec(
                "ReadPerson",
                TestReadingExternalHostService.ReadPerson::class.java.getCanonicalName()!!,
                mapOf("person" to readPersonHandleConnectionSpec)
            )

        writeAndReadPersonPlan = Plan(
            listOf(writePersonParticleSpec, readPersonParticleSpec)
        )

        TestReadingExternalHostService.ReadingExternalHost.reset()
        TestWritingExternalHostService.WritingExternalHost.reset()
    }

    @Test
    fun allocator_canStartArcInTwoExternalHosts() = runBlocking {
        val arcId = allocator.startArcForPlan("test", writeAndReadPersonPlan)
        assertThat(TestReadingExternalHostService.ReadingExternalHost.started.size).isEqualTo(1)
        assertThat(TestWritingExternalHostService.WritingExternalHost.started.size).isEqualTo(1)

        assertThat(allocator.getPartitionsFor(arcId)).contains(
            TestReadingExternalHostService.ReadingExternalHost.started.first()
        )
        assertThat(allocator.getPartitionsFor(arcId)).contains(
            TestWritingExternalHostService.WritingExternalHost.started.first()
        )
    }
}
