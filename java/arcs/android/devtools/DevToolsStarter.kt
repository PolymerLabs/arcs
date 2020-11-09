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

package arcs.android.devtools

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.annotation.VisibleForTesting
import androidx.core.content.ContextCompat.startForegroundService
import arcs.sdk.android.storage.service.StorageService

/**
 * The DevToolsStarter class can be used to start the [DevToolsService]. Requires the [Context]
 * to start the [DevToolsService].
 */
class DevToolsStarter(private val context: Context) {

  @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
  val devToolsIntent: Intent = Intent(context, DevToolsService::class.java)
  private val bundle = Bundle()

  /**
   * Start the [DevToolsService] with the default values.
   */
  fun start() {
    devToolsIntent.putExtras(bundle)
    startForegroundService(context, devToolsIntent)
  }

  /**
   * Start the [DevToolsService] with a custom [StorageService] class.
   */
  fun start(storageService: StorageService) {
    bundle.putSerializable(DevToolsService.STORAGE_CLASS, storageService.javaClass)
    start()
  }
}
