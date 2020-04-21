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

/** Initializes [Log] for tests on the JVM. */
fun initLogForAndroid(level: Log.Level = mapAndroidLogLevel("Arcs")) {
    Log.level = level
    Log.writer = { lvl, renderedMessage, throwable ->
        when (lvl) {
            Log.Level.Debug -> android.util.Log.d("Arcs", renderedMessage, throwable)
            Log.Level.Info -> android.util.Log.i("Arcs", renderedMessage, throwable)
            Log.Level.Warning -> android.util.Log.w("Arcs", renderedMessage, throwable)
            Log.Level.Error -> android.util.Log.e("Arcs", renderedMessage, throwable)
            Log.Level.Wtf -> android.util.Log.wtf("Arcs", renderedMessage, throwable)
        }
    }
    Log.formatter = { _, _, _, rawMessage -> rawMessage }
}

private fun mapAndroidLogLevel(tag: String): Log.Level = arrayOf(
    android.util.Log.DEBUG to Log.Level.Debug,
    android.util.Log.INFO to Log.Level.Info,
    android.util.Log.WARN to Log.Level.Warning,
    android.util.Log.ERROR to Log.Level.Error,
    android.util.Log.ASSERT to Log.Level.Wtf
).find { android.util.Log.isLoggable(tag, it.first) }?.second ?: Log.Level.Error
