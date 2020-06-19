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

package arcs.android.storage.service

import arcs.core.crdt.CrdtException
import arcs.core.util.Log
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Job

/**
 * Implementation of [IResultCallback] which also abides by the [CompletableDeferred] contract, to
 * marry the notion of a callback (required by AIDL) and a deferred (which can be used by kotlin
 * using coroutines).
 */
class DeferredResult(context: CoroutineContext) :
    IResultCallback.Stub(), CompletableDeferred<Boolean> by CompletableDeferred(context[Job.Key]) {

    override fun onResult(exception: ByteArray?) {
        if (exception == null) {
            complete(true)
        } else {
            // TODO(#5551): Consider logging at debug level with exceptionProto.message detail.
            // val exceptionProto = decodeProto(exception, CrdtExceptionProto.getDefaultInstance())
            Log.warning(CrdtException("CRDT Exception: error detail elided.")) {
                "Result was unsuccessful"
            }
            complete(false)
        }
    }
}
