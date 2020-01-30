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

package arcs.core.crdt

import arcs.core.crdt.CrdtChange.Data
import arcs.core.crdt.internal.VersionMap
import arcs.core.type.Type
import kotlin.reflect.KClass

/**
 * A [CrdtModel] can:
 * - merge with other models.
 *   This produces a 2-sided delta (change from this model to merged model, change from other model
 *   to merged model, see [MergeChanges]).
 *   **Note:** [merge] updates the model it is invoked on; the [MergeChanges.modelChange] return
 *   value is a record of changes that have already been applied.
 * - apply an operation.
 *   This might fail (e.g. if the operation is out-of-order), in which case [applyOperation] will
 *   return false.
 * - report on internal data.
 * - report on the client's view of the data.
 *
 * A [CrdtModel] is parameterized by:
 * - the operations that can be applied (see: [Op])
 * - the internal data representation of the model (see: [Data])
 * - the external data representation of the model (see: [ConsumerData])
 *
 * It is possible that two models can't merge. For example, they may have had divergent operations
 * apply. This is a serious error and will result in merge throwing a [CrdtException].
 */
interface CrdtModel<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    /** A copy of the current [VersionMap] of the [data]. */
    val versionMap: VersionMap
    /** Internal (CRDT-friendly) representation of the data used by the model. */
    val data: Data
    /** External (application-friendly) representation of the data used by the model. */
    val consumerView: ConsumerData

    /**
     * Merges the [other] [CrdtModel] into this one returning the changes invoked on this
     * [CrdtModel] as well as the changes required to be invoked on the [other] one.
     *
     * Example:
     * ```kotlin
     * val myModel = SomeCrdtModel(....)
     * val theirModel = SomeCrdtModel(....)
     *
     * // ... do some things concurrently to myModel and theirModel ...
     *
     * val changes = myModel.merge(theirModel.data)
     * // myModel is now up to date.
     * theirModel.applyChanges(changes.otherChange)
     * // theirModel is now up to date.
     * ```
     */
    fun merge(other: Data): MergeChanges<Data, Op>

    /** Applies a [CrdtChange] to this model and returns the overall success of the application. */
    fun applyChanges(changes: CrdtChange<Data, Op>): Boolean = when (changes) {
        is CrdtChange.Operations -> changes.all(this::applyOperation)
        is CrdtChange.Data -> {
            updateData(changes.data)
            true
        }
    }

    /** Applies a single [Op] to the model and returns whether or not it was successful. */
    fun applyOperation(op: Op): Boolean

    /** Updates the internal [Data] representation of the model. */
    fun updateData(newData: Data)
}

/** Internal data representation of a [CrdtModel]. */
interface CrdtData {
    /** Vector clock tracking the changes made to the data by each replica. */
    var versionMap: VersionMap
}

/** Operation which can be performed on a particular [CrdtModel] instance. */
interface CrdtOperation

/** [CrdtOperation] tagged with a specific [VersionMap]. */
interface CrdtOperationAtTime : CrdtOperation {
    /**
     * Time when the operation occurred.
     *
     * **Note:** Be sure this is a *copy* of the owning [CrdtData]'s [VersionMap] so it doesn't
     * change out from under the operation when the model changes.
     */
    val clock: VersionMap
}

/** Changes applied to both sides of a call to [CrdtModel.merge]. */
data class MergeChanges<Data : CrdtData, Op : CrdtOperation>(
    /** Changes already made to the receiver of a `merge` call. */
    val modelChange: CrdtChange<Data, Op>,
    /** Changes which could be made to the argument of a `merge` call to bring it into sync. */
    val otherChange: CrdtChange<Data, Op>
)

/**
 * A [CrdtChange] represents a delta between model states.
 *
 * Where possible, this delta should be expressed as a list of [CrdtOperation]s (a
 * [CrdtChange.Operations] object).
 *
 * Sometimes it isn't possible to express a delta as operations. In this case, a complete post-merge
 * [Data] object will be represented as a [CrdtChange.Data].
 */
sealed class CrdtChange<Data : CrdtData, Op : CrdtOperation> {
    abstract fun isEmpty(): Boolean

    /** Representation of a change as a series of [CrdtOperation]s. */
    data class Operations<Data : CrdtData, Op : CrdtOperation>(
        /** Series of [Op]s required to complete the [CrdtChange]. */
        val ops: MutableList<Op> = mutableListOf()
    ) : CrdtChange<Data, Op>(), MutableList<Op> by ops {
        override fun isEmpty(): Boolean = ops.isEmpty()
    }

    /**
     * Representation of a change where a series of [CrdtOperation]s is not possible - contains the
     * end result.
     */
    data class Data<Data : CrdtData, Op : CrdtOperation>(
        /** New representation of the internal data for the [CrdtModel]. */
        val data: Data
    ) : CrdtChange<Data, Op>() {
        override fun isEmpty(): Boolean = false
    }
}

/** Defines a [Type] that's capable of generating a [CrdtModel]. */
interface CrdtModelType<Data : CrdtData, Op : CrdtOperation, ConsumerData> : Type {
    /** The [KClass] of the [Data] this type works with. */
    val crdtModelDataClass: KClass<*>

    /** Creates a new instance of a [CrdtModel]. */
    fun createCrdtModel(): CrdtModel<Data, Op, ConsumerData>
}
