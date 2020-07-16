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

package arcs.core.util

/**
 * Global configuration for ArcsStrictMode flags.
 */
object ArcsStrictMode {
    private var strictHandles_ = ArcsStrictModeProvider.strictHandles()

    /**
     * If true, [Handle] operations not executed within a [Scheduler] dispatcher
     * will throw an error.
     */
    var strictHandles
        get() = strictHandles_
        internal set(value) {
            strictHandles_ = value
        }

    /**
     * [Handle] operations not executed within a [Scheduler] dispatcher
     * will throw an error.
     */
    fun enableStrictHandles() {
        strictHandles_ = true
    }

    /** [Handle] operations can be executed from any context (but may silently fail) */
    fun disableStrictHandles() {
        strictHandles_ = false
    }

    /**
     * Temporarily enable/disable [strictHandles] during test code block execution and restore previous
     * settings when done.
     */
    fun enableStrictHandlesForTest(enabled: Boolean = true, block: () -> Unit) {
        val old = strictHandles_
        strictHandles_ = enabled
        try {
            block()
        } finally {
            strictHandles_ = old
        }
    }
}
