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

package arcs.core.util.testutil

import arcs.core.util.Log
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Locale

/** Initializes [Log] for tests on the JVM. */
fun initLogForTest() {
    Log.level = Log.Level.Debug
    Log.writer = { level, renderedMessage ->
        if (level == Log.Level.Warning || level == Log.Level.Error || level == Log.Level.Wtf) {
            System.err.println(renderedMessage)
        } else {
            println(renderedMessage)
        }
    }
    Log.formatter = { index, level, throwable, rawMessage ->
        val stackTrace = throwable?.let {
            val writer = StringWriter()
            throwable.printStackTrace(PrintWriter(writer))
            "\n$writer"
        } ?: ""

        String.format(
            Locale.ENGLISH,
            "%05d (%10s) %s: %s%s",
            index, Thread.currentThread().name, level, rawMessage, stackTrace
        )
    }

    val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, error ->
        Log.wtf(error) { "Uncaught Exception" }
        defaultHandler.uncaughtException(thread, error)
    }
}
