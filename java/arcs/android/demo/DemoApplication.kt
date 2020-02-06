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

package arcs.android.demo

import android.app.Application
import arcs.android.util.initLogForAndroid
import arcs.core.util.Log

/** Application class for Arcs Demo. */
class DemoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        initLogForAndroid(Log.Level.Debug)
    }
}
