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
import arcs.sdk.android.storage.service.StorageService

/**
 * The DevToolsStarter class can be used to start the [DevToolsService]. Requires the [Context]
 * to start the [DevToolsService].
 */
class DevToolsStarter(private val context: Context) {

  /**
   * Start the [DevToolsService] with an optional custom [StorageService] class.
   */
  fun start(storageClass: Class<*> = StorageService::class.java) {
    // Check if the Class received is a child of the StorageService.
    require(StorageService::class.java.isAssignableFrom(storageClass)) {
      "$storageClass is not a child of StorageService"
    }

    val devToolsIntent = Intent(context, DevToolsService::class.java)
    val bundle = Bundle().apply {
      putSerializable(DevToolsService.STORAGE_CLASS, storageClass)
    }
    devToolsIntent.putExtras(bundle)

    context.applicationContext.startForegroundService(devToolsIntent)
  }
}
