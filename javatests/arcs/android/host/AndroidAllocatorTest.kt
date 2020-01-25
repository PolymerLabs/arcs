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
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.Allocator
import arcs.core.host.HandleConnectionSpec
import arcs.core.host.HandleSpec
import arcs.core.host.ParticleSpec
import arcs.core.host.Plan
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
    private lateinit var context: Context
    private lateinit var service: TestReadingExternalHostService
    private lateinit var service2: TestWritingExternalHostService
    private lateinit var allocator: Allocator
    private lateinit var hostRegistry: AndroidManifestHostRegistry
    private lateinit var personHandleSpec: HandleSpec
    private lateinit var readPersonHandleConnectionSpec: HandleConnectionSpec
    private lateinit var writePersonHandleConnectionSpec: HandleConnectionSpec
    private lateinit var writePersonParticleSpec: ParticleSpec
    private lateinit var readPersonParticleSpec: ParticleSpec
    private lateinit var writeAndReadPersonPlan: Plan
    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(setOf("name"), emptySet()),
        SchemaDescription()
    )

    @Before
    fun setUp() {
        service = Robolectric.setupService(TestReadingExternalHostService::class.java)
        service2 = Robolectric.setupService(TestWritingExternalHostService::class.java)

        context = InstrumentationRegistry.getInstrumentation().targetContext
        hostRegistry =
            AndroidManifestHostRegistry(context) {
                if (it.component
                        ?.equals(
                            TestReadingExternalHostService::class.toComponentName(context)
                        ) == true
                ) {
                    service.onStartCommand(it, 0, 0)
                } else if (it.component
                        ?.equals(
                            TestWritingExternalHostService::class.toComponentName(context)
                        ) == true
                ) {
                    service2.onStartCommand(it, 0, 0)
                }
            }
        allocator = Allocator(hostRegistry)

        personHandleSpec =
            HandleSpec(
                null, "recipePerson", null, mutableSetOf("volatile"),
                personSchema
            )

        writePersonParticleSpec =
            ParticleSpec(
                "WritePerson",
                TestWritingExternalHostService.WritePerson::class.java.getCanonicalName()!!
            )
        writePersonHandleConnectionSpec =
            HandleConnectionSpec("person", personHandleSpec, writePersonParticleSpec)

        readPersonParticleSpec =
            ParticleSpec(
                "ReadPerson",
                TestReadingExternalHostService.ReadPerson::class.java.getCanonicalName()!!
            )
        readPersonHandleConnectionSpec =
            HandleConnectionSpec("person", personHandleSpec, readPersonParticleSpec)

        writeAndReadPersonPlan = Plan(
            listOf(writePersonHandleConnectionSpec, readPersonHandleConnectionSpec)
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
