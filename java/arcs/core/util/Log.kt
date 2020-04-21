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

import arcs.core.util.Log.formatter
import arcs.core.util.Log.toString
import arcs.core.util.Log.writer
import kotlinx.atomicfu.atomic
/**
 * Arcs-specific logging utility.
 *
 * Allows for pluggable log-output sinks (see [writer]) and message [formatter]s.
 */
object Log {
    /* internal */ val logIndex = atomic(0)

    /** The current log level. See [Level]. */
    var level = DEFAULT_LEVEL

    /**
     * Formatter for a given raw message and [Level].
     *
     * Only prints the [toString] of the supplied [Throwable] and its causes if non-null because
     * Kotlin's common library doesn't include `printStackTrace` (only JVM/Native do, JavaScript
     * does not).
     */
    var formatter: (index: Int, level: Level, throwable: Throwable?, rawMessage: String) -> String =
        DEFAULT_FORMATTER

    /**
     * Writer of a fully-realized message.
     *
     * Default implementation uses [println].
     */
    var writer: (level: Level, renderedMessage: String, throwable: Throwable?) -> Unit =
        DEFAULT_WRITER

    /** Defines available logging-levels. */
    enum class Level {
        // Order matters here.
        Debug, Info, Warning, Error, Wtf
    }

    /** Logs at a debug-level. */
    fun debug(throwable: Throwable? = null, messageBuilder: () -> String) =
        maybeLog(Level.Debug, throwable, messageBuilder)

    /** Logs at an info-level. */
    fun info(throwable: Throwable? = null, messageBuilder: () -> String) =
        maybeLog(Level.Info, throwable, messageBuilder)

    /** Logs at a warning-level. */
    fun warning(throwable: Throwable? = null, messageBuilder: () -> String) =
        maybeLog(Level.Warning, throwable, messageBuilder)

    /** Logs at an error-level. */
    fun error(throwable: Throwable? = null, messageBuilder: () -> String) =
        maybeLog(Level.Error, throwable, messageBuilder)

    /** Logs at a wtf-level. */
    fun wtf(throwable: Throwable? = null, messageBuilder: () -> String) =
        maybeLog(Level.Wtf, throwable, messageBuilder)

    /** Restores the default values for the log index, [level], [writer], and [formatter]. */
    fun restoreDefaults() {
        logIndex.value = 0
        level = DEFAULT_LEVEL
        formatter = DEFAULT_FORMATTER
        writer = DEFAULT_WRITER
    }

    private fun maybeLog(level: Level, throwable: Throwable? = null, messageBuilder: () -> String) {
        if (this.level <= level) {
            writer(
                level,
                formatter(logIndex.incrementAndGet(), level, throwable, messageBuilder()),
                throwable
            )
        }
    }
}

private val DEFAULT_LEVEL = Log.Level.Error

private val DEFAULT_FORMATTER: (
    index: Int,
    level: Log.Level,
    throwable: Throwable?,
    rawMessage: String
) -> String =
    { index, level, throwable, rawMessage ->
        "$index - ${level.name}: $rawMessage" +
            if (throwable != null) {
                var currentThrowable = throwable
                var isFirst = true
                val throwableMessages = mutableListOf<String>()
                while (currentThrowable != null) {
                    throwableMessages += "${if (isFirst) "" else "Caused by: "}$currentThrowable"
                    currentThrowable = currentThrowable.cause
                    isFirst = false
                }
                throwableMessages.joinToString("\n", prefix = "\n")
            } else ""
    }

/* ktlint-disable max-line-length */
private val DEFAULT_WRITER: (level: Log.Level, renderedMessage: String, throwable: Throwable?) -> Unit =
    { _, msg, _ -> println(msg) }
/* ktlint-enable max-line-length */
