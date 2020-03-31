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

package arcs.android.e2e.testapp

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import arcs.android.host.AndroidManifestHostRegistry
import arcs.core.allocator.Allocator
import arcs.core.host.EntityHandleManager
import arcs.core.host.HostRegistry
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/** Entry UI to launch Arcs Test. */
class TestActivity : AppCompatActivity() {

    private val coroutineContext: CoroutineContext = Job() + Dispatchers.Main
    private val scope: CoroutineScope = CoroutineScope(coroutineContext)

    /**
     * Recipe hand translated from 'person.arcs'
     */
    private lateinit var allocator: Allocator
    private lateinit var hostRegistry: HostRegistry
    private lateinit var resultView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.test_activity)
        resultView = findViewById<Button>(R.id.result)

        scope.launch {
            hostRegistry = AndroidManifestHostRegistry.create(this@TestActivity)
            allocator = Allocator.create(
                hostRegistry,
                EntityHandleManager(
                    time = JvmTime,
                    activationFactory = ServiceStoreFactory(
                        context = this@TestActivity,
                        lifecycle = this@TestActivity.lifecycle
                    )
                )
            )

            findViewById<Button>(R.id.person_test).apply {
                setOnClickListener {
                    testPersonRecipe()
                }
                // Now we can enable the test button as allocator is initialized.
                visibility = View.VISIBLE
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)

        intent?.run {
            scope.launch {
                resultView.text = intent.getStringExtra(RESULT_NAME)
            }
        }
    }

    private fun testPersonRecipe() {
        scope.launch {
            val arcId = allocator.startArcForPlan("Person", PersonRecipePlan)
            allocator.stopArc(arcId)
        }
    }

    companion object {
        const val RESULT_NAME = "result"
    }
}
