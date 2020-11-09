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

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.sdk.android.storage.service.StorageService
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DevToolsStarterTest {

  @Test
  fun start_createsIntent() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val devToolsStarter = DevToolsStarter(context)
    val devToolsIntent = Intent(context, DevToolsService::class.java)

    devToolsStarter.start()
    assertThat(devToolsStarter.devToolsIntent.toUri(0)).isEqualTo(devToolsIntent.toUri(0))
  }

  @Test
  fun start_withStorageService_appliesBundle() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val devToolsStarter = DevToolsStarter(context)

    val devToolsIntent = Intent(context, DevToolsService::class.java)
    val bundle = Bundle().apply {
      putSerializable(DevToolsService.STORAGE_CLASS, StorageService::class.java)
    }
    devToolsIntent.putExtras(bundle)

    devToolsStarter.start(StorageService())
    assertThat(devToolsStarter.devToolsIntent.toUri(0)).isEqualTo(devToolsIntent.toUri(0))
  }
}
