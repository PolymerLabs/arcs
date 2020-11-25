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
package arcs.android.labs.host

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.annotation.VisibleForTesting
import arcs.core.host.ArcHost
import arcs.core.host.HostRegistry
import arcs.core.host.api.Particle
import arcs.sdk.android.labs.host.ArcHostHelper
import arcs.sdk.android.labs.host.IntentRegistryAdapter
import arcs.sdk.android.labs.host.toRegistryHost
import kotlinx.coroutines.TimeoutCancellationException

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
 * ```
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
) : HostRegistry() {

  private val serviceHosts = mutableListOf<IntentRegistryAdapter>()
  private val arcHosts = mutableListOf<ArcHost>()

  /** Discover all Android services which handle [ArcHost] operations. */
  fun initialize(): AndroidManifestHostRegistry = apply {
    serviceHosts.addAll(findHostsByManifest())
  }

  /**
   * Inspects AndroidManifest.xml for any <service> tags with
   * ```xml
   * <intent-filter>
   *   <action android:name="arcs.android.host.ARC_HOST"/>
   * </intent-filter>
   * ```
   *
   * Constructs an [ArcHost] delegate that communicates via [Intent]s for each
   * [Service] discovered.
   */
  private fun findHostsByManifest(): List<IntentRegistryAdapter> =
    context.packageManager.queryIntentServices(
      Intent(ArcHostHelper.ACTION_HOST_INTENT),
      PackageManager.MATCH_ALL
    )
      .filter { it.serviceInfo != null }
      .map { it.serviceInfo.toRegistryHost(sender) }

  override suspend fun availableArcHosts(): List<ArcHost> {
    if (arcHosts.isEmpty()) {
      arcHosts.addAll(serviceHosts.flatMap { registryHost ->
        try {
          registryHost.registeredHosts()
        } catch (e: TimeoutCancellationException) {
          emptyList<ArcHost>()
        }
      })
    }
    return arcHosts
  }

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

  companion object {
    /** Auxiliary constructor with default sender. */
    fun create(ctx: Context) =
      AndroidManifestHostRegistry(ctx) { intent -> ctx.startService(intent) }.initialize()

    /** Auxiliary constructor for testing. */
    @VisibleForTesting
    fun createForTest(ctx: Context, sender: (Intent) -> Unit) =
      AndroidManifestHostRegistry(ctx, sender).initialize()
  }
}
