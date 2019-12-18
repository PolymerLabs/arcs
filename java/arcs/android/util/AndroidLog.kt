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

package arcs.android.util

import arcs.core.util.Log
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Locale

/** Initializes [Log] for tests on the JVM. */
fun initLogForAndroid(level: Log.Level) {
    Log.level = level
    Log.writer = { level, renderedMessage ->
        when (level) {
            Log.Level.Debug -> android.util.Log.d("Arcs", renderedMessage)
            Log.Level.Info -> android.util.Log.i("Arcs", renderedMessage)
            Log.Level.Warning -> android.util.Log.w("Arcs", renderedMessage)
            Log.Level.Error -> android.util.Log.e("Arcs", renderedMessage)
            Log.Level.Wtf -> android.util.Log.wtf("Arcs", renderedMessage)
        }
    }
    Log.formatter = { _, _, throwable, rawMessage ->
        val stackTrace = throwable?.let {
            val writer = StringWriter()
            throwable.printStackTrace(PrintWriter(writer))
            "\n$writer"
        } ?: ""

        String.format(Locale.ENGLISH, "%s%s", rawMessage, stackTrace)
    }
}
