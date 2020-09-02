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
 * Allows the user to create a scoped log utility where everything logged will be prepended with the output of
 * [tagBuilder].
 */
class TaggedLog(private val tagBuilder: () -> String) {
    private fun taggedMessageBuilder(messageBuilder: () -> String): () -> String {
        return { "${tagBuilder()}: ${messageBuilder()}" }
    }

    /** Logs at a verbose-level. */
    fun verbose(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.verbose(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at a debug-level. */
    fun debug(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.debug(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at an info-level. */
    fun info(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.info(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at a warning-level. */
    fun warning(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.warning(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at an error-level. */
    fun error(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.error(throwable, taggedMessageBuilder(messageBuilder))

    /** Logs at a wtf-level. */
    fun wtf(throwable: Throwable? = null, messageBuilder: () -> String) =
        Log.wtf(throwable, taggedMessageBuilder(messageBuilder))
}
