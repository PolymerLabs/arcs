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
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Parcelable
import android.os.ResultReceiver
import arcs.core.host.ArcHost
import arcs.core.host.ParticleIdentifier
import arcs.core.host.PlanPartition
import java.io.Serializable
import kotlin.reflect.KClass
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

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
 *       override suspend fun onStartArc(plan: PlanPartition) {
 *         // ...
 *       }
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
class ArcHostHelper(private val service: Service, private val arcHost: ArcHost) {

    private val job = Job() + Dispatchers.IO + CoroutineName("ArcHostHelper")

    /**
     * Determines whether or not the given [Intent] represents a call to an [ArcHost] and invokes
     * the appropriate interface methods.
     */
    fun onStartCommand(intent: Intent?) = CoroutineScope(job).launch {
        onStartCommandSuspendable(intent)
    }

    // VisibleForTesting
    suspend fun onStartCommandSuspendable(intent: Intent?) {
        // Ignore other actions
        if (intent?.action?.startsWith(ARC_HOST_INTENT) != true) return

        // Ignore Intent when it doesn't target our Service
        if (intent.component?.equals(ComponentName(service, service::class.java)) != true) return

        when (intent.getSerializableExtra(OPERATION) as Operation?) {
            Operation.START_ARC -> runWithResult(intent) {
                arcHost.startArc(
                    intent.getParcelableExtra<ParcelablePlanPartition?>(
                        OPERATION_ARG
                    )?.actual!!
                )
            }
            Operation.STOP_ARC -> runWithResult(intent) {
                arcHost.stopArc(
                    intent.getParcelableExtra<ParcelablePlanPartition?>(
                        OPERATION_ARG
                    )?.actual!!
                )
            }
            Operation.REGISTER_PARTICLE -> runWithResult(intent) {
                arcHost.registerParticle(
                    intent.getParcelableExtra<ParcelableParticleIdentifier?>(
                        OPERATION_ARG
                    )?.actual!!
                )
            }
            Operation.UNREGISTER_PARTICLE -> runWithResult(intent) {
                arcHost.unregisterParticle(
                    intent.getParcelableExtra<ParcelableParticleIdentifier?>(
                        OPERATION_ARG
                    )?.actual!!
                )
            }
            Operation.GET_REGISTERED_PARTICLES -> runWithResult(intent) {
                arcHost.registeredParticles()
            }
            else -> {
                throw IllegalArgumentException("Operation $intent not implemented.")
            }
        }
    }

    /**
     * Execute an [ArcHost] method in the block, encode return into a [Bundle] and send via
     * [ResultReceiver]
     */
    private suspend fun runWithResult(intent: Intent, block: suspend () -> Any?) {
        val bundle = Bundle()
        val result = block()

        when (result) {
            is List<*> -> {
                val arrayList = ArrayList<ParcelableParticleIdentifier>()
                result.forEach {
                    it as ParticleIdentifier
                    arrayList += it.toParcelable()
                }
                bundle.putParcelableArrayList(OPERATION_RESULT, arrayList)
            }
            is Parcelable -> bundle.putParcelable(OPERATION_RESULT, result)
            is Serializable -> bundle.putSerializable(OPERATION_RESULT, result)
            else -> {
                // Unit
            }
        }
        // This triggers a suspended coroutine to resume with the value.
        intent.getParcelableExtra<ResultReceiver>(OPERATION_RECEIVER)?.send(0, bundle)
    }

    enum class Operation {
        START_ARC, STOP_ARC, REGISTER_PARTICLE, UNREGISTER_PARTICLE,
        GET_REGISTERED_PARTICLES
    }

    companion object {
        const val ARC_HOST_INTENT = "arcs.android.host.ARC_HOST"
        const val OPERATION = "OPERATION"
        const val OPERATION_ARG = "OPERATION_ARG"
        const val OPERATION_RECEIVER = "OPERATION_RECEIVER"
        const val OPERATION_RESULT = "OPERATION_RESULT"

        fun createArcHostIntent(
            operation: Operation,
            component: ComponentName,
            argument: Parcelable?
        ): Intent = Intent(ARC_HOST_INTENT).setComponent(component)
            .putExtra(OPERATION, operation)
            .putExtra(
                OPERATION_ARG,
                argument
            )

        fun onResult(intent: Intent, receiver: ResultReceiver?) =
            intent.putExtra(OPERATION_RECEIVER, receiver)

        fun createStartArcHostIntent(
            service: ComponentName,
            planPartition: PlanPartition
        ): Intent = createArcHostIntent(
            Operation.START_ARC,
            service,
            planPartition.toParcelable()
        )

        fun createStopArcHostIntent(
            service: ComponentName,
            planPartition: PlanPartition
        ): Intent = createArcHostIntent(
            Operation.STOP_ARC,
            service,
            planPartition.toParcelable()
        )

        fun createRegisterParticleIntent(
            componentName: ComponentName,
            particleIdentifier: ParticleIdentifier
        ) = createArcHostIntent(
            Operation.REGISTER_PARTICLE, componentName, particleIdentifier.toParcelable()
        )

        fun createUnregisterParticleIntent(
            componentName: ComponentName,
            particleIdentifier: ParticleIdentifier
        ) = createArcHostIntent(
            Operation.UNREGISTER_PARTICLE, componentName, particleIdentifier.toParcelable()
        )

        fun createGetRegisteredParticlesIntent(componentName: ComponentName): Intent =
            createArcHostIntent(
                Operation.GET_REGISTERED_PARTICLES,
                componentName,
                null
            )
    }
}

fun KClass<out Service>.toComponentName(context: Context) = ComponentName(context, this.java)
