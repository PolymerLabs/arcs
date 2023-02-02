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

package arcs.sdk.android.storage

import android.app.Service
import android.content.Context
import android.content.Intent
import arcs.android.common.resurrection.ResurrectionRequest
import arcs.core.storage.StorageKey
import arcs.sdk.android.storage.service.StorageService

/**
 * Tool which can be used by Arc Hosts to register with the [StorageService] for resurrection.
 *
 * ## Important note:
 *
 * The [Context] used to register for resurrection and the [ResurrectionRequest] received by the
 * storage service have a one-to-one relationship. This means that there should be only one
 * [ResurrectionHelper] used per service.
 *
 * ## Example Usage:
 *
 * ```kotlin
 * class MyService : Service() {
 *     private val myHelper: ResurrectionHelper by lazy {
 *         ResurrectionHelper(this, ::onResurrected)
 *     }
 *
 *     override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) {
 *         val result = super.onStartCommand(intent, flags, startId)
 *         myHelper.onStartCommand(intent)
 *         return result
 *     }
 *
 *     private fun something() {
 *         // ...
 *         myHelper.requestResurrection(listOf(RamDiskStorageKey("foo")))
 *         // ...
 *     }
 *
 *     private fun onResurrected(keys: List<StorageKey>) {
 *         // ...
 *     }
 * }
 * ```
 */
class ResurrectionHelper(
  private val context: Context
) {
  /**
   * Issue a request to be resurrected by the [StorageService] whenever the data identified by
   * the provided [keys] changes.
   *
   * **Note:** This will overwrite any previous request with the same [targetId].
   * In other words, [keys] should be an exhaustive list of the [StorageKey]s the caller is
   * interested in.
   */
  fun requestResurrection(
    targetId: String,
    keys: List<StorageKey>,
    serviceClass: Class<out Service> = StorageService::class.java
  ) {
    val intent = Intent(context, serviceClass)
    val request = ResurrectionRequest.createDefault(context, keys, targetId)
    request.populateRequestIntent(intent)
    context.startService(intent)
  }

  /**
   * Issue a request to cancel any outstanding request for resurrection from the [StorageService].
   */
  fun cancelResurrectionRequest(
    targetId: String,
    serviceClass: Class<out Service> = StorageService::class.java
  ) {
    val intent = Intent(context, serviceClass)
    val request = ResurrectionRequest.createDefault(context, emptyList(), targetId)
    request.populateUnrequestIntent(intent)
    context.startService(intent)
  }
}
