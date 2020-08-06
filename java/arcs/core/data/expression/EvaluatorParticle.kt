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

package arcs.core.data.expression

import arcs.core.data.Plan
import arcs.core.host.api.HandleHolder
import arcs.sdk.BaseParticle
import arcs.sdk.HandleHolderBase

class EvaluatorParticle(metadata: Plan.Particle?) : BaseParticle() {
    override val handles = Handles(requireNotNull(metadata))

    class Handles(metadata: Plan.Particle) : HandleHolderBase(
        "ExpressionEvaluatorParticle",
        mapOf(
//            "joinData" to setOf(EntityBaseSpec(schema))
        )
    ) {
//        val joinData: ReadCollectionHandle<EntityBase> by handles
    }

    override fun onReady() {
        super.onReady()

        // eval
    }
}
