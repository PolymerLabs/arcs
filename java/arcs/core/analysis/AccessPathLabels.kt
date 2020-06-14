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

package arcs.core.analysis

import arcs.core.data.AccessPath
// A change to test piper import.

/**
 * An [AbstractValue] that keeps track of [InformationFlowLabels] for different [AccessPath] values.
 *
 * This abstract value uses a map from [AccessPath] to [InformationFlowLabels] to keep track of the
 * labels for each access path. We use a reduced bottom construction, i.e., whenever a value for an
 * access path is `BOTTOM`, the whole map is considered `BOTTOM`.
 */
data class AccessPathLabels private constructor(
    private val _accessPathLabels: BoundedAbstractElement<Map<AccessPath, InformationFlowLabels>>
) : AbstractValue<AccessPathLabels> {
    override val isBottom = _accessPathLabels.isBottom
    override val isTop = _accessPathLabels.isTop

    val accessPathLabels: Map<AccessPath, InformationFlowLabels>?
        get() = _accessPathLabels.value

    override infix fun isEquivalentTo(other: AccessPathLabels): Boolean {
        return _accessPathLabels.isEquivalentTo(other._accessPathLabels) { a, b ->
            a.size == b.size && a.all { (accessPath, aLabels) ->
                b[accessPath]?.isEquivalentTo(aLabels) ?: false
            }
        }
    }

    override infix fun join(other: AccessPathLabels): AccessPathLabels {
        return AccessPathLabels(
            _accessPathLabels.join(other._accessPathLabels) { thisMap, otherMap ->
                val result = thisMap.toMutableMap()
                otherMap.forEach { (accessPath, otherLabels) ->
                    val thisLabels = thisMap[accessPath]
                    result.put(accessPath, thisLabels?.join(otherLabels) ?: otherLabels)
                }
                result
            }
        )
    }

    override infix fun meet(other: AccessPathLabels): AccessPathLabels {
        if (this.isBottom || other.isBottom) return AccessPathLabels.getBottom()
        if (this.isTop) return other
        if (other.isTop) return this
        val thisMap = requireNotNull(this.accessPathLabels)
        val otherMap = requireNotNull(other.accessPathLabels)
        val result = mutableMapOf<AccessPath, InformationFlowLabels>()
        thisMap.forEach { (accessPath, thisLabels) ->
            otherMap[accessPath]?.meet(thisLabels)?.let {
                result[accessPath] = it
            }
        }
        return AccessPathLabels.makeValue(result)
    }

    override fun toString() = toString(linePrefix = "", transform = null)

    fun toString(linePrefix: String = "", transform: ((Int) -> String)?): String {
        return when {
            _accessPathLabels.isTop -> "${linePrefix}TOP"
            _accessPathLabels.isBottom -> "${linePrefix}BOTTOM"
            else -> requireNotNull(_accessPathLabels.value).map { (accessPath, labels) ->
                "$accessPath -> ${labels.toString(transform)}"
            }.joinToString("\n$linePrefix", prefix = linePrefix)
        }
    }

    companion object {
        fun getBottom(): AccessPathLabels {
            return AccessPathLabels(
                BoundedAbstractElement.getBottom<Map<AccessPath, InformationFlowLabels>>()
            )
        }

        fun getTop(): AccessPathLabels {
            return AccessPathLabels(
                BoundedAbstractElement.getTop<Map<AccessPath, InformationFlowLabels>>()
            )
        }

        /**
         * Creates an [AccessPathLabels] with [map]. If any of the values in [map] is `bottom`,
         * returns `bottom`.
         */
        fun makeValue(map: Map<AccessPath, InformationFlowLabels>): AccessPathLabels {
            val isBottom = map.any { (_, labels) ->
                labels.isBottom || (labels.labelSets?.isEmpty() == true)
            }
            if (isBottom) return getBottom()
            return AccessPathLabels(BoundedAbstractElement.makeValue(map))
        }
    }
}
