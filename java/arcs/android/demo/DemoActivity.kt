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

package arcs.android.demo

import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import arcs.android.host.AndroidManifestHostRegistry
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.allocator.Allocator
import arcs.core.data.Capabilities
import arcs.core.data.CreateableStorageKey
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.host.HostRegistry
import arcs.core.storage.StorageKey
import arcs.core.storage.handle.Stores
import arcs.core.type.Type
import arcs.jvm.util.JvmTime
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/** Entry UI to launch Arcs demo. */
class DemoActivity : AppCompatActivity() {

    private val coroutineContext: CoroutineContext = Job() + Dispatchers.Main
    private val scope: CoroutineScope = CoroutineScope(coroutineContext)

    /**
     * Recipe hand translated from 'person.arcs'
     */
    private lateinit var allocator: Allocator
    private lateinit var hostRegistry: HostRegistry

    private lateinit var recipePersonStorageKey: StorageKey
    private lateinit var readPersonHandleConnection: Plan.HandleConnection
    private lateinit var writePersonHandleConnection: Plan.HandleConnection
    private lateinit var writePersonParticle: Plan.Particle
    private lateinit var readPersonParticle: Plan.Particle
    private lateinit var personPlan: Plan

    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        "42"
    )
    private var personEntityType: Type = SingletonType(EntityType(personSchema))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.main_activity)

        scope.launch {
            hostRegistry = AndroidManifestHostRegistry.create(this@DemoActivity)
            allocator = Allocator.create(
                hostRegistry,
                JvmTime,
                AndroidHandleManager(
                    this@DemoActivity,
                    this@DemoActivity.getLifecycle(),
                    Dispatchers.Default,
                    null,
                    Stores()
                )
            )

            recipePersonStorageKey = CreateableStorageKey(
                "recipePerson", Capabilities.TiedToRuntime
            )

            writePersonHandleConnection =
                Plan.HandleConnection(recipePersonStorageKey, HandleMode.Write, personEntityType)

            writePersonParticle = Plan.Particle(
                "WritePerson",
                DemoService.WritePerson::class.java.canonicalName!!,
                mapOf("person" to writePersonHandleConnection)
            )

            readPersonHandleConnection =
                Plan.HandleConnection(recipePersonStorageKey, HandleMode.Read, personEntityType)

            readPersonParticle = Plan.Particle(
                "ReadPerson",
                DemoService.ReadPerson::class.java.canonicalName!!,
                mapOf("person" to readPersonHandleConnection)
            )

            personPlan = Plan(
                listOf(writePersonParticle, readPersonParticle)
            )

            findViewById<Button>(R.id.person_test).setOnClickListener {
                testPersonRecipe()
            }
        }
    }

    private fun testPersonRecipe() {
        scope.launch {
            val arcId = allocator.startArcForPlan("Person", personPlan)
            allocator.stopArc(arcId)
        }
    }
}
