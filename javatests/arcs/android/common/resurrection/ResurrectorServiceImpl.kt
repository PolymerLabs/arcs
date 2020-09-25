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

package arcs.android.common.resurrection

import android.content.Intent
import android.os.IBinder

class ResurrectorServiceImpl : ResurrectorService() {
  override fun onBind(intent: Intent?): IBinder? = null
}
