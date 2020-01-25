/*
 * Copyright 2019 Google LLC.
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
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.ResultReceiver
import arcs.android.host.ArcHostHelper.Companion.ARC_HOST_INTENT
import arcs.android.host.ArcHostHelper.Companion.OPERATION_RESULT
import arcs.core.host.ArcHost
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleIdentifier
import arcs.core.host.PlanPartition
import arcs.core.sdk.Particle
import arcs.jvm.host.ServiceLoaderHostRegistry
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * A [HostRegistry] that discovers available [ArcHost] services by using [PackageManager] to
 * query Android [Service] declarations in AndroidManfiest which can respond to a specific Inte.t
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
class AndroidManifestHostRegistry(val context: Context, val sender: (Intent) -> Unit) :
    HostRegistry {

    private val arcHosts: MutableList<ArcHost> = mutableListOf()

    /**
     * Auxiliary constructor with default sender.
     */
    constructor(ctx: Context) : this(ctx, { intent -> ctx.startService(intent) })

    init {
        runBlocking {
            // Discover all Android services which handle ArcHost operations
            arcHosts.addAll(findHostsByManifest())
        }
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
            .filter {
                it.serviceInfo != null
            }
            .map {
                IntentArcHostAdapter(
                    context, ComponentName(
                        it.serviceInfo.packageName,
                        it.serviceInfo.name
                    ), sender
                )
            }

    /**
     * An [ArcHost] stub that translates API calls to [Intent]s directed at a [Service] using
     * [ArcHostHelper] to handle them.
     * @property arcHostComponentName the [ComponentName] of the [Service]
     * @property sender a callback used to fire the [Intent], overridable to allow testing.
     */
    public class IntentArcHostAdapter(
        val ctx: Context,
        val arcHostComponentName: ComponentName,
        val sender: (Intent) -> Unit
    ) : ArcHost {

        override suspend fun hostId() = arcHostComponentName.flattenToString()

        override suspend fun registerParticle(particle: ParticleIdentifier) {
            sendIntentToArcHostServiceForResult(
                ArcHostHelper.createRegisterParticleIntent(arcHostComponentName, particle)
            ) { }
        }

        override suspend fun unregisterParticle(particle: ParticleIdentifier) {
            sendIntentToArcHostServiceForResult(
                ArcHostHelper.createUnregisterParticleIntent(particle.toComponentName(), particle)
            ) { }
        }

        override suspend fun registeredParticles(): List<ParticleIdentifier> =
            sendIntentToArcHostServiceForResult(
                ArcHostHelper.createGetRegisteredParticlesIntent(arcHostComponentName)
            ) {
                it?.let {
                    it as List<*>
                    it.map {
                        it as ParcelableParticleIdentifier
                        it.actual
                    }
                }
            } ?: listOf()

        override suspend fun startArc(partition: PlanPartition) {
            sendIntentToArcHostServiceForResult(
                ArcHostHelper.createStartArcHostIntent(
                    arcHostComponentName, partition
                )
            ) {}
        }

        override suspend fun stopArc(partition: PlanPartition) {
            sendIntentToArcHostServiceForResult(
                ArcHostHelper.createStopArcHostIntent(
                    arcHostComponentName, partition
                )
            ) {}
        }

        /**
         * Asynchronously send an [ArcHost] command via [Intent] without waiting for return result.
         */
        private fun sendIntentToArcHostService(intent: Intent) {
            sender(intent)
        }

        @UseExperimental(ExperimentalCoroutinesApi::class)
        class ResultReceiverContinuation<T>(
            val continuation: CancellableContinuation<T?>,
            val block: (Any?) -> T?
        ) : ResultReceiver(Handler()) {
            override fun onReceiveResult(resultCode: Int, resultData: Bundle?) =
                continuation.resume(block(resultData?.get(OPERATION_RESULT)),
                    { throw it })
        }

        /**
         * Sends an asynchronous [ArcHost] command via [Intent] to a [Service] and waits for a
         * result using a suspendable coroutine.
         * @property intent the [ArcHost] command, usually from [ArcHostHelper]
         * @property transformer a lambda to map return values from a [Bundle] into other types.
         */
        private suspend fun <T> sendIntentToArcHostServiceForResult(
            intent: Intent,
            transformer: (Any?) -> T?
        ): T? = suspendCancellableCoroutine {
            ArcHostHelper.onResult(intent, ResultReceiverContinuation(it, transformer))
            sendIntentToArcHostService(intent)
        }

        override fun hashCode(): Int {
            return arcHostComponentName.hashCode()
        }

        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as IntentArcHostAdapter
            if (arcHostComponentName != other.arcHostComponentName) return false
            return true
        }
    }

    override suspend fun availableArcHosts(): List<ArcHost> = arcHosts

    override suspend fun registerHost(host: ArcHost) {
        throw UnsupportedOperationException(
            "Hosts cannot be registered directly, use registerService()"
        )
    }

    suspend fun registerService(service: Service) {
        arcHosts += adapterFor(service)
    }

    suspend fun runegisterService(service: Service) {
        arcHosts -= adapterFor(service)
    }

    override suspend fun unregisterHost(host: ArcHost) {
        throw UnsupportedOperationException(
            "Hosts cannot be unregistered directly, use unregisterService()"
        )
    }

    // VisibleForTesting
    fun adapterFor(
        service: Service
    ) = IntentArcHostAdapter(context, ComponentName(context, service::class.java), sender)
}
