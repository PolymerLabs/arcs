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
package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.common.Id
import arcs.core.host.EntityHandleManager
import arcs.core.storage.handle.Stores
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

fun AndroidEntityHandleManager(
    context: Context,
    lifecycle: Lifecycle,
    arcId: String = Id.Generator.newSession().newArcId("arc").toString(),
    hostId: String = "nohost",
    coroutineContext: CoroutineContext = EmptyCoroutineContext,
    connectionFactory: ConnectionFactory? = null,
    stores: Stores = Stores()
) = EntityHandleManager(
    AndroidHandleManager(
        context,
        lifecycle,
        coroutineContext,
        connectionFactory,
        stores
    ),
    arcId,
    hostId
)
