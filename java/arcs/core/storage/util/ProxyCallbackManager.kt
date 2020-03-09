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

package arcs.core.storage.util

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import kotlinx.atomicfu.atomic

/**
 * Implementation of [AbstractProxyCallbackManager] where each callback is given a token from an
 * increasing source.
 */
class ProxyCallbackManager<Data : CrdtData, Op : CrdtOperation, ConsumerData> :
    AbstractProxyCallbackManager<Data, Op, ConsumerData>() {
    /* internal */ val nextCallbackToken = atomic(1)

    override fun getNextToken(currentlyUsedTokens: Set<Int>): Int =
        nextCallbackToken.getAndIncrement()
}
