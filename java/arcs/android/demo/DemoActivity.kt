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
import arcs.core.host.HostRegistry
import arcs.core.storage.handle.Stores
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.main_activity)

        scope.launch {
            hostRegistry = AndroidManifestHostRegistry.create(this@DemoActivity)
            allocator = Allocator.create(
                hostRegistry,
                // TODO(152435750) - Switch to using SDK entity handles
                AndroidHandleManager(
                    this@DemoActivity,
                    this@DemoActivity.getLifecycle(),
                    Dispatchers.Default,
                    null,
                    Stores()
                )
            )

            findViewById<Button>(R.id.person_test).setOnClickListener {
                testPersonRecipe()
            }
        }
    }

    private fun testPersonRecipe() {
        scope.launch {
            val arcId = allocator.startArcForPlan("Person", PersonRecipePlan)
            allocator.stopArc(arcId)
        }
    }
}
