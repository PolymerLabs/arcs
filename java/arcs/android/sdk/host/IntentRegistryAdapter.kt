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
package arcs.android.sdk.host

import android.content.ComponentName
import android.content.Intent
import arcs.core.host.ArcHost

/**
 * Queries [ArcHostHelper] for registered hosts, to support one-to-many [Service] to [ArcHost] fan
 * out.
 *
 * @param hostComponentName the [ComponentName] of the [Service]
 * @param sender a callback used to fire the [Intent], overridable to allow testing.
 */
open class IntentRegistryAdapter(
    hostComponentName: ComponentName,
    sender: (Intent) -> Unit
) : IntentHostAdapter(hostComponentName, sender) {

    suspend fun registeredHosts(): List<ArcHost> {
        return sendIntentToHostServiceForResult(
            hostComponentName.createAvailableHostsIntent()
        ) {
            (it as? List<*>)?.map { hostId ->
                IntentArcHostAdapter(hostComponentName, hostId.toString(), sender)
            }
        } ?: emptyList()
    }
}
