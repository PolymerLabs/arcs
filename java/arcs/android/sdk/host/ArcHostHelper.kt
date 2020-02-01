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

import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Bundle
import android.os.Handler
import android.os.Parcelable
import android.os.ResultReceiver
import androidx.annotation.VisibleForTesting
import arcs.android.host.parcelables.ActualParcelable
import arcs.android.host.parcelables.ParcelableParticleIdentifier
import arcs.android.host.parcelables.ParcelablePlanPartition
import arcs.android.host.parcelables.toParcelable
import arcs.core.host.ArcHost
import arcs.core.host.ParticleIdentifier
import arcs.core.host.PlanPartition
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.CoroutineContext
import kotlin.reflect.KClass

/**
 * Tool which can be used by [ArcHost]s to handle [Intent] based API calls, as well as
 * send API calls.
 *
 * ## Example Usage:
 *
 * ```kotlin
 * class MyService : Service() {
 *     private val myHelper: ArcHostHelper by lazy {
 *         ArcHostHelper(MyArcHost())
 *     }
 *
 *     class MyArcHost : AbstractArcHost() {
 *         override suspend fun onStartArc(plan: PlanPartition) {
 *             // ...
 *         }
 *     }
 *
 *     override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) {
 *         val result = super.onStartCommand(intent, flags, startId)
 *         myHelper.onStartCommand(intent)
 *         return result
 *     }
 * }
 * ```
 */
class ArcHostHelper(
    private val service: Service,
    private val arcHost: ArcHost,
    private val coroutineContext: CoroutineContext = Dispatchers.IO
) {

    private val job = Job() + coroutineContext + CoroutineName("ArcHostHelper")

    /**
     * Determines whether or not the given [Intent] represents a call to an [ArcHost] and invokes
     * the appropriate interface methods.
     */
    fun onStartCommand(intent: Intent?) = CoroutineScope(job).launch {
        onStartCommandSuspendable(intent)
    }

    @VisibleForTesting
    suspend fun onStartCommandSuspendable(intent: Intent?) {
        // Ignore other actions
        if (intent?.action?.startsWith(
                ARC_HOST_INTENT
            ) != true
        ) return

        // Ignore Intent when it doesn't target our Service
        if (intent.component?.equals(ComponentName(service, service::class.java)) != true) return

        when (intent.getIntExtra(
            OPERATION, Operation.values().size
        ).toOperation()) {
            Operation.START_ARC -> runWithResult(
                intent, ParcelablePlanPartition::class, arcHost::startArc
            )
            Operation.STOP_ARC -> runWithResult(
                intent, ParcelablePlanPartition::class, arcHost::stopArc
            )
            Operation.REGISTER_PARTICLE -> runWithResult(
                intent, ParcelableParticleIdentifier::class, arcHost::registerParticle
            )
            Operation.UNREGISTER_PARTICLE -> runWithResult(
                intent, ParcelableParticleIdentifier::class, arcHost::unregisterParticle
            )
            Operation
                .GET_REGISTERED_PARTICLES -> runWithResult(intent, arcHost::registeredParticles)
            else -> {
                throw IllegalArgumentException("Operation $intent not implemented.")
            }
        }
    }

    private suspend fun <T : ActualParcelable<U>, U, V> runWithResult(
        intent: Intent,
        parcelable: KClass<T>, // dummy argument for type inference
        block: suspend (U) -> V
    ) = runWithResult(intent) {
        val argument = intent.getParcelableExtra<T>(OPERATION_ARG)?.actual
        argument?.let { block(it) }
    }

    /**
     * Execute an [ArcHost] method in the block, encode return into a [Bundle] and send via
     * [ResultReceiver]
     */
    private suspend fun runWithResult(
        intent: Intent, block: suspend () -> Any?
    ) {
        val bundle = Bundle()
        val result = block()

        when (result) {
            is List<*> -> {
                val arrayList = ArrayList<ParcelableParticleIdentifier>()
                result.forEach {
                    arrayList += (it as ParticleIdentifier).toParcelable()
                }
                bundle.putParcelableArrayList(
                    OPERATION_RESULT, arrayList
                )
            }
            is Parcelable -> bundle.putParcelable(
                OPERATION_RESULT, result
            )
            is Operation -> bundle.putInt(
                OPERATION_RESULT, result.ordinal
            )
            else -> Unit
        }
        // This triggers a suspended coroutine to resume with the value.
        intent.getParcelableExtra<ResultReceiver>(
            OPERATION_RECEIVER
        )?.send(0, bundle)
    }

    internal enum class Operation {
        START_ARC,
        STOP_ARC,
        REGISTER_PARTICLE,
        UNREGISTER_PARTICLE,
        GET_REGISTERED_PARTICLES

    }

    companion object {
        const val ARC_HOST_INTENT = "arcs.android.host.ARC_HOST"
        private const val OPERATION = "OPERATION"
        private const val OPERATION_ARG = "OPERATION_ARG"
        private const val OPERATION_RECEIVER = "OPERATION_RECEIVER"
        private const val OPERATION_RESULT = "OPERATION_RESULT"

        internal fun createArcHostIntent(
            operation: Operation,
            component: ComponentName,
            argument: Parcelable?
        ): Intent = Intent(
            ARC_HOST_INTENT
        ).setComponent(component)
            .putExtra(OPERATION, operation.ordinal)
            .putExtra(
                OPERATION_ARG, argument
            )

        @VisibleForTesting
        fun onResult(intent: Intent, receiver: ResultReceiver?) =
            intent.putExtra(
                OPERATION_RECEIVER, receiver
            )

        @VisibleForTesting
        fun getParticleIdentifierListResult(resultData: Bundle?): List<ParticleIdentifier>? =
            resultData?.getParcelableArrayList<ParcelableParticleIdentifier>(
                OPERATION_RESULT
            )?.map { it -> it.actual }
    }

    /**
     * An [ArcHost] stub that translates API calls to [Intent]s directed at a [Service] using
     * [ArcHostHelper] to handle them.
     *
     * @property arcHostComponentName the [ComponentName] of the [Service]
     * @property sender a callback used to fire the [Intent], overridable to allow testing.
     */
    class IntentArcHostAdapter(
        private val arcHostComponentName: ComponentName,
        private val sender: (Intent) -> Unit
    ) : ArcHost {

        override fun hostId() = arcHostComponentName.flattenToString()

        override suspend fun registerParticle(particle: ParticleIdentifier) {
            sendIntentToArcHostServiceForResult(
                particle.createRegisterParticleIntent(arcHostComponentName)
            )
        }

        override suspend fun unregisterParticle(particle: ParticleIdentifier) {
            sendIntentToArcHostServiceForResult(
                particle.createUnregisterParticleIntent(arcHostComponentName)
            )
        }

        override suspend fun registeredParticles(): List<ParticleIdentifier> =
            sendIntentToArcHostServiceForResult(
                arcHostComponentName.createGetRegisteredParticlesIntent()
            ) {
                it?.let { list ->
                    list as List<*>
                    list.map {
                        (it as ParcelableParticleIdentifier).actual
                    }
                }
            } ?: emptyList()

        override suspend fun startArc(partition: PlanPartition) {
            sendIntentToArcHostServiceForResult(
                partition.createStartArcHostIntent(
                    arcHostComponentName
                )
            )
        }

        override suspend fun stopArc(partition: PlanPartition) {
            sendIntentToArcHostServiceForResult(
                partition.createStopArcHostIntent(
                    arcHostComponentName
                )
            )
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
                continuation.resume(
                    block(
                        resultData?.get(
                            OPERATION_RESULT
                        )
                    )
                ) {}
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
        ): T? = suspendCancellableCoroutine { cancelableContinuation ->
            onResult(
                intent, ResultReceiverContinuation(cancelableContinuation, transformer)
            )
            sendIntentToArcHostService(intent)
        }

        /**
         * Sends an asynchronous [ArcHost] command via [Intent] and waits for it to complete
         * with no return value.
         */
        private suspend fun sendIntentToArcHostServiceForResult(
            intent: Intent
        ): Unit? = sendIntentToArcHostServiceForResult(intent) {}

        override fun hashCode(): Int = arcHostComponentName.hashCode()

        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as ArcHost
            if (hostId().equals(other.hostId())) return false
            return true
        }
    }
}

private fun Int.toOperation() = if (this < ArcHostHelper.Operation.values()
        .size
) ArcHostHelper.Operation.values()[this] else null

/** Return a [ComponentName] given the [KClass] of a [Service]. */
@VisibleForTesting
fun KClass<out Service>.toComponentName(context: Context) = ComponentName(context, this.java)

/** Create a wrapper around a [Service] to invoke it's internal [ArcHost] via [Intent]s */
fun Service.toArcHost(context: Context, sender: (Intent) -> Unit) =
    ArcHostHelper.IntentArcHostAdapter(this::class.toComponentName(context), sender)

/** Create a wrapper around a [ServiceInfo] to invoke the associate [Service]'s internal [ArcHost]
 *  via [Intent]s
 **/
fun ServiceInfo.toArcHost(sender: (Intent) -> Unit) =
    ArcHostHelper.IntentArcHostAdapter(
        ComponentName(this.packageName, this.name),
        sender
    )

/**
 * Creates an [Intent] to invoke [ArcHost.registerParticle] on a [Service]'s internal [ArcHost].
 */
@VisibleForTesting
fun ParticleIdentifier.createRegisterParticleIntent(
    componentName: ComponentName
) = ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.REGISTER_PARTICLE,
    componentName, this.toParcelable()
)

/**
 * Creates an [Intent] to invoke [ArcHost.unregisterParticle] on a [Service]'s internal [ArcHost].
 */
@VisibleForTesting
fun ParticleIdentifier.createUnregisterParticleIntent(
    componentName: ComponentName
) = ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.UNREGISTER_PARTICLE,
    componentName, this.toParcelable()
)

/**
 * Creates an [Intent] to invoke [ArcHost.registeredParticles] on a [Service]'s internal [ArcHost].
 */
@VisibleForTesting
fun ComponentName.createGetRegisteredParticlesIntent(): Intent =
    ArcHostHelper.createArcHostIntent(
        ArcHostHelper.Operation
            .GET_REGISTERED_PARTICLES,
        this,
        null
    )

/**
 * Creates an [Intent] to invoke [ArcHost.startArc] on a [Service]'s internal [ArcHost].
 */
@VisibleForTesting
fun PlanPartition.createStartArcHostIntent(
    service: ComponentName
): Intent =
    ArcHostHelper.createArcHostIntent(
        ArcHostHelper.Operation.START_ARC,
        service,
        this.toParcelable()
    )

/**
 * Creates an [Intent] to invoke [ArcHost.stopArc] on a [Service]'s internal [ArcHost].
 */
@VisibleForTesting
fun PlanPartition.createStopArcHostIntent(
    service: ComponentName
): Intent =
    ArcHostHelper.createArcHostIntent(
        ArcHostHelper.Operation.STOP_ARC,
        service,
        this.toParcelable()
    )

