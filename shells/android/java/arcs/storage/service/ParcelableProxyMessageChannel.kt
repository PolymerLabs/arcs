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

package arcs.storage.service

import androidx.annotation.VisibleForTesting
import arcs.core.crdt.CrdtException
import arcs.core.storage.util.SendQueue
import arcs.core.util.TaggedLog
import arcs.crdt.parcelables.toParcelable
import arcs.storage.parcelables.ParcelableProxyMessage
import arcs.storage.service.ParcelableProxyMessageChannel.MessageAndResult
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.BroadcastChannel
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope

/**
 * Implementation of [IStorageServiceCallback] which also abides by the [BroadcastChannel] interface
 * contract, this can be used to marry the notion of a storage service *callback* (required by AIDL)
 * and a channel (which can be subsribed to by kotlin code, with coroutines).
 */
@UseExperimental(ExperimentalCoroutinesApi::class)
class ParcelableProxyMessageChannel(
    coroutineContext: CoroutineContext
) : IStorageServiceCallback.Stub(),
    BroadcastChannel<MessageAndResult> by BroadcastChannel(10) {

    @VisibleForTesting
    val scope = CoroutineScope(coroutineContext + CoroutineName("ParcelableProxyMessageChannel"))
    private val sendQueue = SendQueue()

    override fun onProxyMessage(message: ParcelableProxyMessage, resultCallback: IResultCallback) {
        scope.launch {
            val messageAndResult = MessageAndResult(
                message,
                CompletableDeferred(coroutineContext[Job.Key])
            )
            sendQueue.enqueue {
                send(messageAndResult)

                try {
                    supervisorScope {
                        val success = messageAndResult.result.await()
                        if (success) {
                            resultCallback.onResult(null)
                        } else throw CrdtException(
                            "Message could not be handled (returned false as result)"
                        )
                    }
                } catch (e: CrdtException) {
                    resultCallback.onResult(e.toParcelable())
                }
            }
        }
    }

    /** Container for a message and its callback. */
    data class MessageAndResult(
        val message: ParcelableProxyMessage,
        val result: CompletableDeferred<Boolean>
    )

    companion object {
        private val log = TaggedLog { "ParcelableProxyMessageChannel" }
    }
}
