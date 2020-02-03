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
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
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
 *         ArcHostHelper(this, MyArcHost())
 *     }
 *
 *     override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) {
 *         val result = super.onStartCommand(intent, flags, startId)
 *         myHelper.onStartCommand(intent)
 *         return result
 *     }
 *
 *     class MyArcHost : AbstractArcHost() {
 *         override suspend fun onStartArc(plan: PlanPartition) {
 *             // ...
 *         }
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
        val action = intent?.action ?: return
        if (!action.startsWith(ArcHostHelper.ACTION_HOST_INTENT)) return

        // Ignore Intent when it doesn't target our Service
        if (intent.component?.equals(ComponentName(service, service::class.java)) != true) return

        val operation = intent.getIntExtra(EXTRA_OPERATION, Operation.values().size).toOperation()

        when (operation) {
            Operation.StartArc -> runWithResult(
                intent, ParcelablePlanPartition::class, arcHost::startArc
            )
            Operation.StopArc -> runWithResult(
                intent, ParcelablePlanPartition::class, arcHost::stopArc
            )
            Operation.GetRegisteredParticles ->
                runWithResult(intent, arcHost::registeredParticles)
        }
    }

    private suspend fun <T : ActualParcelable<U>, U, V> runWithResult(
        intent: Intent,
        parcelable: KClass<T>, // dummy argument for type inference
        block: suspend (U) -> V
    ) = runWithResult(intent) {
        val argument = intent.getParcelableExtra<T>(EXTRA_OPERATION_ARG)?.actual
        argument?.let { block(it) }
    }

    /**
     * Execute an [ArcHost] method in the block, encode return into a [Bundle] and send via
     * [ResultReceiver]
     */
    private suspend fun runWithResult(
        intent: Intent,
        block: suspend () -> Any?
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
                    EXTRA_OPERATION_RESULT,
                    arrayList
                )
            }
            is Parcelable ->
                bundle.putParcelable(EXTRA_OPERATION_RESULT, result)
            is Operation ->
                bundle.putInt(EXTRA_OPERATION_RESULT, result.ordinal)
            else -> Unit
        }
        // This triggers a suspended coroutine to resume with the value.
        intent.getParcelableExtra<ResultReceiver>(EXTRA_OPERATION_RECEIVER)
            ?.send(0, bundle)
    }

    internal enum class Operation {
        StartArc,
        StopArc,
        GetRegisteredParticles
    }

    companion object {
        const val ACTION_HOST_INTENT = "arcs.android.host.ARC_HOST"
        private const val EXTRA_OPERATION = "OPERATION"
        private const val EXTRA_OPERATION_ARG = "EXTRA_OPERATION_ARG"
        private const val EXTRA_OPERATION_RECEIVER = "EXTRA_OPERATION_RECEIVER"
        internal const val EXTRA_OPERATION_RESULT = "EXTRA_OPERATION_RESULT"

        internal fun createArcHostIntent(
            operation: Operation,
            component: ComponentName,
            argument: Parcelable?
        ): Intent = Intent(ACTION_HOST_INTENT).setComponent(component)
            .putExtra(EXTRA_OPERATION, operation.ordinal)
            .putExtra(EXTRA_OPERATION_ARG, argument)

        /**
         * Used by callers to specify a callback [ResultReceiver] for an [Intent] to be invoked
         * with a result after an [ACTION_HOST_INTENT] is processed.
         */
        @VisibleForTesting
        fun setResultReceiver(intent: Intent, receiver: ResultReceiver?) =
            intent.putExtra(EXTRA_OPERATION_RECEIVER, receiver)

        @VisibleForTesting
        fun getParticleIdentifierListResult(resultData: Bundle?): List<ParticleIdentifier> =
            resultData?.getParcelableArrayList<ParcelableParticleIdentifier>(
                EXTRA_OPERATION_RESULT
            )?.map { it -> it.actual } ?: listOf()
    }

}

private fun Int.toOperation(): ArcHostHelper.Operation?  {
    if (this < ArcHostHelper.Operation.values().size) {
        return ArcHostHelper.Operation.values()[this]
    } else {
        return null
    }
}

/** Return a [ComponentName] given the [KClass] of a [Service]. */
@VisibleForTesting
fun KClass<out Service>.toComponentName(context: Context) = ComponentName(context, this.java)

/** Create a wrapper around a [Service] to invoke it's internal [ArcHost] via [Intent]s */
fun Service.toArcHost(context: Context, sender: (Intent) -> Unit) =
    IntentArcHostAdapter(this::class.toComponentName(context), sender)

/**
 * Create a wrapper around a [ServiceInfo] to invoke the associate [Service]'s internal [ArcHost]
 * via [Intent]s
 **/
fun ServiceInfo.toArcHost(sender: (Intent) -> Unit) =
    IntentArcHostAdapter(
        ComponentName(this.packageName, this.name), sender
    )

/**
 * Creates an [Intent] to invoke [ArcHost.registeredParticles] on a [Service]'s internal [ArcHost].
 */
@VisibleForTesting
fun ComponentName.createGetRegisteredParticlesIntent(): Intent =
    ArcHostHelper.createArcHostIntent(
        ArcHostHelper.Operation.GetRegisteredParticles,
        this,
        null
    )

/**
 * Creates an [Intent] to invoke [ArcHost.startArc] on a [Service]'s internal [ArcHost].
 */
@VisibleForTesting
fun PlanPartition.createStartArcHostIntent(service: ComponentName): Intent =
    ArcHostHelper.createArcHostIntent(
        ArcHostHelper.Operation.StartArc,
        service,
        this.toParcelable()
    )

/**
 * Creates an [Intent] to invoke [ArcHost.stopArc] on a [Service]'s internal [ArcHost].
 */
@VisibleForTesting
fun PlanPartition.createStopArcHostIntent(service: ComponentName): Intent =
    ArcHostHelper.createArcHostIntent(
        ArcHostHelper.Operation.StopArc,
        service,
        this.toParcelable()
    )

