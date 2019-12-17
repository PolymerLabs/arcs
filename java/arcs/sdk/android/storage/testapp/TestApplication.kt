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

package arcs.sdk.android.storage.testapp

import android.app.Application
import arcs.android.util.initLogForAndroid
import arcs.core.util.Log

/** Application class for the storage test app. */
class TestApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        initLogForAndroid(Log.Level.Debug)
    }
}
