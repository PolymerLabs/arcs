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

package arcs.android.common.resurrection

import android.app.Application
import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.common.resurrection.ResurrectionRequest.Companion.ACTION_RESURRECT
import arcs.android.common.resurrection.ResurrectionRequest.Companion.EXTRA_RESURRECT_NOTIFIER
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import java.io.PrintWriter
import java.io.StringWriter
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowService

@RunWith(AndroidJUnit4::class)
class ResurrectorServiceTest {
    private lateinit var context: Context
    private lateinit var resurrectionRequest: ResurrectionRequest
    private lateinit var resurrectionRequestIntent: Intent
    private val storageKeys = listOf(
        RamDiskStorageKey("foo"),
        RamDiskStorageKey("bar")
    )

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext<Application>()
        resurrectionRequest = ResurrectionRequest.createDefault(context, storageKeys)
        resurrectionRequestIntent = Intent(context, ResurrectorServiceImpl::class.java)
            .apply(resurrectionRequest::populateRequestIntent)
    }

    @Test
    fun resurrectClients() = lifecycle { service, serviceShadow ->
        // Resurrect for "foo"
        service.resurrectClients(storageKeys[0])

        // Ensure the correct intent was issued.
        val resurrectIntent = serviceShadow.nextStartedService
        assertThat(resurrectIntent.component).isEqualTo(resurrectionRequest.componentName)
        assertThat(resurrectIntent.action).isEqualTo(ACTION_RESURRECT)
        assertThat(resurrectIntent.getStringArrayListExtra(EXTRA_RESURRECT_NOTIFIER))
            .containsExactly(storageKeys[0].toString())
    }

    @Test
    fun dumpRegistrations() = lifecycle { service, _ ->
        val stringWriter = StringWriter()
        service.dumpRegistrations(PrintWriter(stringWriter))

        assertThat(stringWriter.toString())
            .isEqualTo(
                """
                    Resurrection Requests
                    ---------------------
                    [
                      ${resurrectionRequest.componentName} [Service]: [
                        ${storageKeys[0]},
                        ${storageKeys[1]}
                      ]
                    ]
                    
                """.trimIndent()
            )
    }

    @Test
    fun unregisterRequest() = lifecycle { service, shadow ->
        // Tell the service to unregister the request.
        val intent = Intent(context, ResurrectorServiceImpl::class.java)
        resurrectionRequest.populateUnrequestIntent(intent)
        service.onStartCommand(intent, 0, 0)

        // Attempt a resurrection.
        service.resurrectClients(storageKeys)

        // No service should've been started.
        assertThat(shadow.peekNextStartedService()).isNull()
    }

    @Test
    fun resetRegistrations() = lifecycle { service, shadow ->
        // Tell the service to clear the whole resurrection database.
        val intent = Intent(context, ResurrectorServiceImpl::class.java)
        intent.action = ResurrectorService.ACTION_RESET_REGISTRATIONS
        service.onStartCommand(intent, 0, 0)

        // Attempt a resurrection.
        service.resurrectClients(storageKeys)

        // No service should've been started.
        assertThat(shadow.peekNextStartedService()).isNull()
    }

    private fun lifecycle(
        block: suspend (ResurrectorServiceImpl, ShadowService) -> Unit
    ) = runBlocking {
        Robolectric.buildService(ResurrectorServiceImpl::class.java, resurrectionRequestIntent)
            .create()
            .startCommand(0, 0)
            .also {
                it.get().apply {
                    val shadow = shadowOf(this)
                    // Wait for the loadJob to join to ensure the registration goes through.
                    loadJob?.join()

                    // Do the stuff while the service is alive
                    block(this, shadow)
                }
            }
            .destroy()
        Unit
    }
}
