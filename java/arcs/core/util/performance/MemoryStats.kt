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

package arcs.core.util.performance

/** Identify a memory consumption type with a description [desc]. */
enum class MemoryIdentifier(val desc: String) {
    TOTAL("Total memory usage in KB"),
    JAVA_HEAP("The private Java Heap usage in KB"),
    NATIVE_HEAP("The private Native Heap usage in KB"),
    CODE_STATIC("The memory usage for static code and resources in KB"),
    STACK("The stack memory usage in KB"),
    GRAPHICS("The graphics memory usage in KB"),
    SYSTEM("Shared and system memory usage in KB"),
    OTHER("Other private memory usage in KB"),

    /** Declare more per-platform/per-OS/per-purpose memory ids here. */
}

/**
 * Arcs memory-stats utility.
 *
 * Usage:
 *   a) Traverses all memory types and their usage:
 *     for ((id, usage) in MemoryStats.snapshot()) {
 *       doWhatever(/* with the id and its usage */)
 *     }
 *
 *   b) Query usage of memory types you're interested:
 *     val usage = MemoryStats.stat(TOTAL, JAVA_HEAP, NATIVE_HEAP)
 *     doWhatever(/* with the usage */)
 */
object MemoryStats {
    /** Connect to platform/os-dependent stats retrieval pipe. */
    var pipe = DEFAULT_PIPE

    /**
     * Take a snapshot of memory stats of current process.
     * Return a map whose key is [MemoryIdentifier] and whose value is memory size in KB.
     */
    fun snapshot(): Map<MemoryIdentifier, Long> = pipe()

    /** Get the memory stats of current process on the given memory ids. */
    fun stat(vararg ids: MemoryIdentifier): List<Long> =
        snapshot().run { ids.map { this[it] ?: 0L } }
}

private val DEFAULT_PIPE = { emptyMap<MemoryIdentifier, Long>() }
