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
import android.os.Bundle
import android.os.Handler
import android.os.ResultReceiver
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostException
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout

/**
 * A stub that translates API calls into [Intent]s directed at a [Service] using
 * [ArcHostHelper] to handle them.
 *
 * @property hostComponentName the [ComponentName] of the [Service]
 * @property sender a callback used to fire the [Intent], overridable to allow testing.
 */
abstract class IntentHostAdapter(
    protected val hostComponentName: ComponentName,
    protected val sender: (Intent) -> Unit
) {
    /**
     * Asynchronously send a command via [Intent] without waiting for return result.
     */
    protected fun sendIntentToHostService(intent: Intent) {
        sender(intent)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    class ResultReceiverContinuation<T>(
        val continuation: CancellableContinuation<T?>,
        val block: (Any?) -> T?
    ) : ResultReceiver(Handler()) {
        override fun onReceiveResult(resultCode: Int, resultData: Bundle?) {
            val exception = resultData?.getString(ArcHostHelper.EXTRA_OPERATION_EXCEPTION)
            exception?.let {
                continuation.cancel(
                    ArcHostException(
                        exception,
                        resultData.getString(ArcHostHelper.EXTRA_OPERATION_EXCEPTION_STACKTRACE, "")
                    )
                )
            } ?: run {
                continuation.resume(
                    block(
                        resultData?.get(
                            ArcHostHelper.EXTRA_OPERATION_RESULT
                        )
                    ),
                    onCancellation = {}
                )
            }
        }
    }

    /**
     * Sends an asynchronous [ArcHost] command via [Intent] to a [Service] and waits for a
     * result using a suspendable coroutine.
     *
     * @property intent the [ArcHost] command, usually from [ArcHostHelper]
     * @property transformer a lambda to map return values from a [Bundle] into other types.
     */
    protected suspend fun <T> sendIntentToHostServiceForResult(
        intent: Intent,
        transformer: (Any?) -> T?
    ): T? = withTimeout(ARCHOST_INTENT_TIMEOUT_MS) {
        suspendCancellableCoroutine { continuation: CancellableContinuation<T?> ->
            ArcHostHelper.setResultReceiver(
                intent,
                ResultReceiverContinuation(continuation, transformer)
            )
            sendIntentToHostService(intent)
        }
    }

    /**
     * Sends an asynchronous [ArcHost] command via [Intent] and waits for it to complete
     * with no return value.
     */
    protected suspend fun sendIntentToHostServiceForResult(
        intent: Intent
    ): Unit? = sendIntentToHostServiceForResult(intent) {}

    companion object {
        /**
         * The maximum amount of time to wait for an [ArcHost] to process an [Intent]-based
         * RPC call. This timeout ensures requests don't wait forever.
         */
        const val ARCHOST_INTENT_TIMEOUT_MS = 5000L
    }
}
