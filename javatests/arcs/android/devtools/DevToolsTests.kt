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
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class DevToolsTests {

  val session1 = mock(DevWebServerImpl.WsdSocket::class.java)
  val session2 = mock(DevWebServerImpl.WsdSocket::class.java)

  @Test
  fun testDevToolsServiceOnMessageCallback() {
    val devToolsIntent = Intent(
      ApplicationProvider.getApplicationContext<Context>(),
      DevToolsService::class.java
    )
    val bundle = Bundle()
    bundle.putSerializable(DevToolsService.STORAGE_CLASS, StorageService::class.java)

    devToolsIntent.putExtras(bundle)

    val devTools = DevToolsService()
    session1.open
    session2.open
    val message = "{\"type\":\"request\", \"message\":\"storageKeys\"}"
    devTools.onMessageCallback(message, session1)
    verify(session1).send("")
    verify(session2, never()).send("")
  }
}
