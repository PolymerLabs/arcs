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

package arcs.core.storage.util

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyCallback
import kotlin.random.Random

/**
 * Thread-safe manager of a collection of [ProxyCallback]s, uses [Random.nextInt] and [baseData] to
 * generate callback tokens.
 *
 * This implementation is preferable to the regular [ProxyCallbackManager] in situations where
 * more than one host is connecting to the store at a time.
 */
class RandomProxyCallbackManager<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    /**
     * A salt of sorts, used to help in making callback IDs more unique across hosts.
     *
     * On the JVM, for example, consider using a UUID's `.toString()`
     */
    private val baseData: String,
    /** Source of randomness to use when generating callback IDs. */
    private val random: Random
) : AbstractProxyCallbackManager<Data, Op, ConsumerData>() {
    override fun getNextToken(currentlyUsedTokens: Set<Int>): Int {
        var unique = random.nextInt()
        var tokenString = "$unique::$baseData"

        while (tokenString.hashCode() in currentlyUsedTokens) {
            unique = random.nextInt()
            tokenString = "$unique::$baseData"
        }

        return tokenString.hashCode()
    }
}
