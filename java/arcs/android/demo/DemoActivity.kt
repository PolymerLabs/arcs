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
import arcs.core.allocator.Allocator
import arcs.core.host.EntityHandleManager
import arcs.core.host.HostRegistry
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.StoreManager
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

/** Entry UI to launch Arcs demo. */
@OptIn(ExperimentalCoroutinesApi::class)
class DemoActivity : AppCompatActivity() {

    private val coroutineContext: CoroutineContext = Job() + Dispatchers.Main
    private val scope: CoroutineScope = CoroutineScope(coroutineContext)
    private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)

    /**
     * Recipe hand translated from 'person.arcs'
     */
    private lateinit var allocator: Allocator
    private lateinit var hostRegistry: HostRegistry

    private val stores = StoreManager(
        activationFactory = ServiceStoreFactory(
            context = this@DemoActivity
        )
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.main_activity)

        scope.launch {
            hostRegistry = AndroidManifestHostRegistry.create(this@DemoActivity)

            allocator = Allocator.create(
                hostRegistry,
                EntityHandleManager(
                    time = JvmTime,
                    scheduler = schedulerProvider("personArc"),
                    stores = stores

                )
            )

            findViewById<Button>(R.id.person_test).setOnClickListener {
                testPersonRecipe()
            }
        }
    }

    override fun onDestroy() {
        scope.cancel()
        runBlocking {
            stores.reset()
        }
        super.onDestroy()
    }

    private fun testPersonRecipe() {
        scope.launch {
            val arcId = allocator.startArcForPlan(PersonRecipePlan).id
            allocator.stopArc(arcId)
        }
    }
}
