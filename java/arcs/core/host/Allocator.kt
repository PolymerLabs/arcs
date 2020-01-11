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
package arcs.core.host

class Allocator(val arcHosts: List<ArcHost>) {
    val partitionMap: MutableMap<String, List<PlanPartition>> = mutableMapOf()

    fun startArcForPlan(plan: Plan): String {
        val arcId = "arcId"
        // create storage keys
        val partitions = computePartitions(plan)
        partitionMap[arcId] = partitions
        writePartitionMap(arcId, partitions)

        return "arc-id"
    }

    private fun writePartitionMap(arcId: String, partitions: List<PlanPartition>) {
        TODO(
            "not implemented"
        ) // To change body of created functions use File | Settings | File Templates.
    }

    private fun computePartitions(plan: Plan): List<PlanPartition> {
        return listOf()
    }
}
