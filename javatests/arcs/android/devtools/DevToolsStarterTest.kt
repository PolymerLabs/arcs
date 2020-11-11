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

package arcs.android.devtools

import android.app.Application
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.devtools.DevToolsService.Companion.STORAGE_CLASS
import arcs.sdk.android.storage.service.StorageService
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowService

@RunWith(AndroidJUnit4::class)
class DevToolsStarterTest {

  private lateinit var context: Context
  private lateinit var devToolsIntent: Intent

  @Before
  fun setUp() {
    context = ApplicationProvider.getApplicationContext<Application>()
    devToolsIntent = Intent(context, DevToolsService::class.java)
  }

  @Test
  fun start_createsIntent() = lifecycle { _, serviceShadow ->
    val devToolsStarter = DevToolsStarter(context)
    val bundle = Bundle().apply {
      putSerializable(STORAGE_CLASS, StorageService::class.java)
    }
    devToolsIntent.putExtras(bundle)

    devToolsStarter.start()
    val actualIntent = serviceShadow.nextStartedService

    assertThat(actualIntent.filterEquals(devToolsIntent)).isTrue()
    assertThat(actualIntent.extras?.getSerializable(STORAGE_CLASS))
      .isEqualTo(devToolsIntent.extras?.getSerializable(STORAGE_CLASS))
  }

  @Test
  fun start_withStorageService_appliesBundle() = lifecycle { _, serviceShadow ->
      val devToolsStarter = DevToolsStarter(context)
      val bundle = Bundle().apply {
        putSerializable(STORAGE_CLASS, MySecondStorageService::class.java)
      }
      devToolsIntent.putExtras(bundle)

      devToolsStarter.start(MySecondStorageService::class.java)
      val actualIntent = serviceShadow.nextStartedService

      assertThat(actualIntent.filterEquals(devToolsIntent)).isTrue()
      assertThat(actualIntent.extras?.getSerializable(STORAGE_CLASS))
        .isEqualTo(devToolsIntent.extras?.getSerializable(STORAGE_CLASS))
    }

  @Test
  fun start_withBadStorageService_throwsError() = lifecycle { _, _ ->
    val devToolsStarter = DevToolsStarter(context)

    val e = assertFailsWith<IllegalArgumentException> {
      devToolsStarter.start(MyClass::class.java)
    }

    assertThat(e)
      .hasMessageThat()
      .isEqualTo(
        "class arcs.android.devtools.DevToolsStarterTest\$MyClass is not a child of StorageService"
      )
  }

  // Create a child class of StorageService
  open class MyStorageService : StorageService()

  // Create a grandchild class of StorageService
  class MySecondStorageService : MyStorageService()

  class MyClass

  private fun lifecycle(
    block: suspend (DevToolsService, ShadowService) -> Unit
  ) = runBlocking {
    Robolectric.buildService(DevToolsService::class.java, devToolsIntent)
      .create()
      .also {
        it.get().apply {
          val shadow = shadowOf(this)
          // Do the stuff while the service is alive
          block(this, shadow)
        }
      }
      .destroy()
    Unit
  }
}
