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
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.util.toReferencable
import arcs.core.storage.ProxyMessage
import arcs.sdk.android.storage.service.StorageService
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DevToolsProtoTests {

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
    val proxyMessage = ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, Any?>(
      model = CrdtEntity.Data(
        singletons = mapOf(
          "a" to CrdtSingleton<CrdtEntity.Reference>(
            VersionMap("alice" to 1),
            CrdtEntity.ReferenceImpl("AAA".toReferencable().id)
          ),
          "b" to CrdtSingleton<CrdtEntity.Reference>(
            VersionMap("bob" to 1),
            CrdtEntity.ReferenceImpl("BBB".toReferencable().id)
          )
        ),
        collections = mapOf(),
        versionMap = VersionMap("Bar" to 2),
        creationTimestamp = 971,
        expirationTimestamp = -1
      ),
      id = 1
    ).toProto().toByteArray()
    val storeType = DevtoolsMessage.DevToolsProxyMessageProto.StoreType.REFERENCE_MODE
    val storageKey = "whatisaslot"

    val proto = devTools.createProxyMessageProto(
      proxyMessage = proxyMessage,
      storeType = storeType,
      storageKey = storageKey
    )
    val expectedProto = DevtoolsMessage.DevToolsMessageProto.newBuilder()
      .setProxyMessage(
        DevtoolsMessage.DevToolsProxyMessageProto.newBuilder()
          .setProxyMessage(proxyMessage.decodeProxyMessage().toProto())
          .setStoreType(storeType)
          .setStorageKey(storageKey)
          .build()
      )
      .build()

    assertThat(proto).isEqualTo(expectedProto)
  }
}
