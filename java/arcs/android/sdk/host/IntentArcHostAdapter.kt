package arcs.android.sdk.host

import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.ResultReceiver
import arcs.android.host.parcelables.ParcelableParticleIdentifier
import arcs.core.data.ParticleSpec
import arcs.core.data.PlanPartition
import arcs.core.host.ArcHost
import arcs.core.host.ParticleIdentifier
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine

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

    override val hostId = arcHostComponentName.flattenToString()

    override suspend fun registeredParticles(): List<ParticleIdentifier> {
        return sendIntentToArcHostServiceForResult(
            arcHostComponentName.createGetRegisteredParticlesIntent()
        ) {
            (it as? List<*>)?.map { identifier ->
                (identifier as ParcelableParticleIdentifier).actual
            }
        } ?: emptyList()
    }

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

    override suspend fun isHostForSpec(spec: ParticleSpec): Boolean {
        return registeredParticles().contains(ParticleIdentifier.from(spec.location))
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
                        ArcHostHelper.EXTRA_OPERATION_RESULT
                    )
                )
            ) {}
    }

    /**
     * Sends an asynchronous [ArcHost] command via [Intent] to a [Service] and waits for a
     * result using a suspendable coroutine.
     *
     * @property intent the [ArcHost] command, usually from [ArcHostHelper]
     * @property transformer a lambda to map return values from a [Bundle] into other types.
     */
    private suspend fun <T> sendIntentToArcHostServiceForResult(
        intent: Intent,
        transformer: (Any?) -> T?
    ): T? = suspendCancellableCoroutine { cancelableContinuation ->
        ArcHostHelper.setResultReceiver(
            intent,
            ResultReceiverContinuation(cancelableContinuation, transformer)
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

    override fun hashCode(): Int = hostId.hashCode()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as ArcHost
        return hostId == other.hostId
    }
}
