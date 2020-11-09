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

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class DevToolsTests {

  private val session1: DevWebServerImpl.WsdSocket = mock(DevWebServerImpl.WsdSocket::class.java)
  private val session2: DevWebServerImpl.WsdSocket = mock(DevWebServerImpl.WsdSocket::class.java)

  @Test
  fun testDevToolsServiceOnMessageCallback() {
    val devTools = DevToolsService()
    session1.open
    session2.open
    val message = "{\"type\":\"request\", \"message\":\"storageKeys\"}"
    devTools.onMessageCallback(message, session1)
    verify(session1).send("")
    verify(session2, never()).send("")
  }
}
