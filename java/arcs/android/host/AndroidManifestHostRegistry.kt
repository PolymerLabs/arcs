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

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.annotation.VisibleForTesting
import arcs.android.sdk.host.ArcHostHelper.Companion.ARC_HOST_INTENT
import arcs.android.sdk.host.toArcHost
import arcs.core.host.ArcHost
import arcs.core.host.HostRegistry
import arcs.core.sdk.Particle
import arcs.jvm.host.ServiceLoaderHostRegistry

/**
 * A [HostRegistry] that discovers available [ArcHost] services by using [PackageManager] to
 * query Android [Service] declarations in AndroidManfiest which can respond to a specific [Intent]
 * Stub [ArcHost] instances are created which communicate with the [Service] via [Intent]-based
 * RPC.
 *
 * In AndroidManifest.xml a <service> will need to be declared as follows for auto-discovery:
 * ```xml
 * <service android:name=".MyService" android:exported="false">
 *   <intent-filter>
 *     <action android:name="arcs.android.host.ARCS_HOST" />
 *   </intent-filter>
 * </service>
 *```
 * These [ArcHost] implementations are [ExternalHost]s mostly assumed to have
 * pre-registered particles. [ProdHost] will still find its [Particle] implementations
 * via [ServiceLoaderHostRegistry]
 *
 * @property context An android application context
 * @property sender A method used to deliver an [Intent] to a [Service]
 */
class AndroidManifestHostRegistry private constructor(
    private val context: Context,
    private val sender: (Intent) -> Unit
) : HostRegistry {

    private val arcHosts = mutableListOf<ArcHost>()

    companion object {
        /** Auxiliary constructor with default sender. */
        fun create(ctx: Context) =
            AndroidManifestHostRegistry(ctx) { intent -> ctx.startService(intent) }.initialize()

        /** Auxiliary constructor for testing. */
        @VisibleForTesting
        fun createForTest(ctx: Context, sender: (Intent) -> Unit) =
            AndroidManifestHostRegistry(ctx, sender).initialize()
    }

    /**
     * Discover all Android services which handle ArcHost operations.
     */
    fun initialize(): AndroidManifestHostRegistry = apply {
        arcHosts.addAll(findHostsByManifest())
    }

    /**
     * Inspects AndroidManifest.xml for any <service> tags with
     * ```xml
     * <intent-filter>
     *   <action android:name="arcs.android.host.ARC_HOST"/>
     * </intent-filter>
     *```
     *
     * Constructs an [ArcHost] delegate that communicates via [Intent]s for each
     * [Service] discovered.
     */
    private fun findHostsByManifest(): List<ArcHost> =
        context.packageManager.queryIntentServices(
                Intent(ARC_HOST_INTENT),
                PackageManager.MATCH_ALL
            )
            .filter { it.serviceInfo != null }
            .map { it.serviceInfo.toArcHost(sender) }

    override suspend fun availableArcHosts(): List<ArcHost> = arcHosts

    override suspend fun registerHost(host: ArcHost) {
        throw UnsupportedOperationException(
            "Hosts cannot be registered directly, use registerService()"
        )
    }

    override suspend fun unregisterHost(host: ArcHost) {
        throw UnsupportedOperationException(
            "Hosts cannot be unregistered directly, use unregisterService()"
        )
    }
}
