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

package arcs.sdk.android.labs.host

import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Bundle
import android.os.Parcelable
import android.os.ResultReceiver
import androidx.annotation.VisibleForTesting
import arcs.android.common.resurrection.ResurrectionRequest
import arcs.android.host.parcelables.ActualParcelable
import arcs.android.host.parcelables.ParcelableParticleIdentifier
import arcs.android.host.parcelables.ParcelablePlanPartition
import arcs.android.host.parcelables.toParcelable
import arcs.core.common.ArcId
import arcs.core.common.toArcId
import arcs.core.data.Plan
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostException
import arcs.core.host.ArcState
import arcs.core.host.ArcStateChangeRegistration
import arcs.core.host.ParticleIdentifier
import arcs.core.storage.StorageKeyManager
import arcs.core.util.TaggedLog
import kotlin.reflect.KClass
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Tool which can be used by [ArcHost]s to handle [Intent] based API calls, as well as
 * send API calls.
 *
 * ## Example Usage:
 *
 * ```kotlin
 * class MyService : Service() {
 *     private val myHelper: ArcHostHelper by lazy {
 *         ArcHostHelper(this, MyArcHost(), MyArcHost2())
 *     }
 *
 *     override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) {
 *         val result = super.onStartCommand(intent, flags, startId)
 *         myHelper.onStartCommand(intent)
 *         return result
 *     }
 *
 *     class MyArcHost : AbstractArcHost() {
 *         override suspend fun onStartArc(plan: Plan.Partition) {
 *             // ...
 *         }
 *     }
 * }
 * ```
 */
class ArcHostHelper(
  private val service: Service,
  private val storageKeyManager: StorageKeyManager,
  vararg arcHosts: ArcHost
) {
  private val job = SupervisorJob() + Dispatchers.Unconfined + CoroutineName("ArcHostHelper")
  private val arcHostByHostId = mutableMapOf<String, ArcHost>()
  private val log = TaggedLog { "ArcHostHelper" }
  init {
    arcHosts.forEach { arcHostByHostId[it.hostId] = it }
  }

  /**
   * Invoked by [IntentRegistryAdapter] to discover which hosts are handled by this helper.
   */
  private suspend fun availableHosts() = arcHostByHostId.keys

  /**
   * Determines whether or not the given [Intent] represents a call to an [ArcHost] and invokes
   * the appropriate interface methods.
   */
  fun onStartCommand(intent: Intent?) = CoroutineScope(job).launch {
    onStartCommandSuspendable(intent)
  }

  private suspend fun resurrectArc(intent: Intent, arcHost: ResurrectableHost) {
    val targetId = intent.getStringExtra(ResurrectionRequest.EXTRA_REGISTRATION_TARGET_ID)
    if (targetId == null) {
      log.warning { "Received resurrection intent with null target ID" }
      return
    }

    val notifiers = intent.getStringArrayListExtra(ResurrectionRequest.EXTRA_RESURRECT_NOTIFIER)
    if (notifiers == null) {
      log.warning { "Received resurrection intent with null notifiers" }
      return
    }

    arcHost.onResurrected(
      targetId,
      notifiers.map(storageKeyManager::parse)
    )
  }

  @VisibleForTesting
  suspend fun onStartCommandSuspendable(intent: Intent?) {
    val action = intent?.action ?: return

    if (action.startsWith(ResurrectionRequest.ACTION_RESURRECT)) {
      arcHostByHostId.values
        .filterIsInstance<ResurrectableHost>()
        .forEach {
          resurrectArc(intent, it)
        }
    }

    // Ignore other actions
    if (!action.startsWith(ArcHostHelper.ACTION_HOST_INTENT)) return

    // Ignore Intent when it doesn't target our Service
    if (intent.component?.equals(ComponentName(service, service::class.java)) != true) return

    val hostId = intent.getStringExtra(ArcHostHelper.EXTRA_ARCHOST_HOSTID)
    val operation = intent.getIntExtra(EXTRA_OPERATION, Operation.values().size).toOperation()
    val arcHost = hostId?.let { arcHostByHostId[it] }

    if (arcHost == null) {
      if (operation == Operation.AvailableHosts) {
        runWithResult(
          intent,
          this::availableHosts
        )
      }
      return
    }

    when (operation) {
      Operation.StartArc -> runWithResult(
        intent,
        ParcelablePlanPartition::class,
        arcHost::startArc
      )
      Operation.StopArc -> runWithResult(
        intent,
        ParcelablePlanPartition::class,
        arcHost::stopArc
      )
      Operation.GetRegisteredParticles -> runWithResult(
        intent,
        arcHost::registeredParticles
      )
      Operation.LookupArcStatus -> runWithResult(
        intent,
        ParcelablePlanPartition::class,
        arcHost::lookupArcHostStatus
      )
      Operation.Pause -> runWithResult(
        intent,
        arcHost::pause
      )
      Operation.Unpause -> runWithResult(
        intent,
        arcHost::unpause
      )
      Operation.AddOnArcStateChange -> runWithResult(intent) {
        val receiver = requireNotNull(
          intent.getParcelableExtra<ResultReceiver>(EXTRA_OPERATION_ARG)
        ) {
          "Missing ResultReceiver for AddOnArcStateChange"
        }

        val arcId = requireNotNull(intent.getStringExtra(EXTRA_ARCSTATE_CHANGED_ARCID)) {
          "Missing ArcId for AddOnArcStateChange"
        }

        addOnArcStateChange(arcHost, arcId.toArcId(), receiver)
      }
      Operation.RemoveOnArcStateChange -> runWithResult(intent) {
        val receiver = requireNotNull(
          intent.getParcelableExtra<ResultReceiver>(EXTRA_OPERATION_ARG)
        ) {
          "Missing ResultReceiver for RemoveOnArcStateChange"
        }

        val callbackId = requireNotNull(
          intent.getStringExtra(EXTRA_ARCSTATE_CHANGED_CALLBACKID)
        ) {
          "Missing ArcId for RemoveOnArcStateChange"
        }
        removeOnArcStateChange(arcHost, callbackId, receiver)
      }
      else -> Unit
    }
  }

  private suspend fun addOnArcStateChange(
    arcHost: ArcHost,
    arcId: ArcId,
    receiver: ResultReceiver
  ): ArcStateChangeRegistration {
    return arcHost.addOnArcStateChange(arcId) { _, arcState ->
      val bundle = Bundle().apply {
        putString(EXTRA_ARCHOST_HOSTID, arcHost.hostId)
        putString(EXTRA_ARCSTATE_CHANGED_ARCID, arcId.toString())
        putString(EXTRA_ARCSTATE_CHANGED_ARCSTATE, arcState.toString())
      }
      receiver.send(0, bundle)
    }
  }

  private suspend fun removeOnArcStateChange(
    arcHost: ArcHost,
    callbackId: String,
    receiver: ResultReceiver
  ) {
    arcHost.removeOnArcStateChange(ArcStateChangeRegistration(callbackId))
    val bundle = Bundle().apply {
      putString(EXTRA_ARCHOST_HOSTID, arcHost.hostId)
    }
    receiver.send(0, bundle)
  }

  @Suppress("UNUSED_PARAMETER")
  private suspend fun <T : ActualParcelable<U>, U, V> runWithResult(
    intent: Intent,
    parcelable: KClass<T>, // dummy argument for type inference
    block: suspend (U) -> V
  ) = runWithResult(intent) {
    val argument = intent.getParcelableExtra<T>(EXTRA_OPERATION_ARG)?.actual
    argument?.let { block(it) }
  }

  /**
   * Execute an [ArcHost] method in the block, encode return into a [Bundle] and send via
   * [ResultReceiver]
   */
  private suspend fun runWithResult(
    intent: Intent,
    block: suspend () -> Any?
  ) {
    val bundle = Bundle()
    val result = try {
      block()
    } catch (e: Exception) {
      e
    }

    when (result) {
      is Set<*> -> {
        val arrayList = ArrayList<String>()
        result.forEach { arrayList += it.toString() }
        bundle.putStringArrayList(EXTRA_OPERATION_RESULT, arrayList)
      }
      is List<*> -> {
        val arrayList = ArrayList<ParcelableParticleIdentifier>()
        result.forEach {
          arrayList += (it as ParticleIdentifier).toParcelable()
        }
        bundle.putParcelableArrayList(
          EXTRA_OPERATION_RESULT,
          arrayList
        )
      }
      is ArcStateChangeRegistration ->
        bundle.putString(EXTRA_OPERATION_RESULT, result.toString())
      is ArcState ->
        bundle.putString(EXTRA_OPERATION_RESULT, result.toString())
      is Parcelable ->
        bundle.putParcelable(EXTRA_OPERATION_RESULT, result)
      is Operation ->
        bundle.putInt(EXTRA_OPERATION_RESULT, result.ordinal)
      is Exception -> {
        bundle.putString(EXTRA_OPERATION_EXCEPTION, result.message)
        bundle.putString(
          EXTRA_OPERATION_EXCEPTION_STACKTRACE,
          result.stackTrace.joinToString("\n")
        )
      }
      else -> Unit
    }
    // This triggers a suspended coroutine to resume with the value.
    intent.getParcelableExtra<ResultReceiver>(EXTRA_OPERATION_RECEIVER)
      ?.send(0, bundle)

    if (result is Exception) {
      throw result
    }
  }

  internal enum class Operation {
    StartArc,
    StopArc,
    GetRegisteredParticles,
    AvailableHosts,
    LookupArcStatus,
    Pause,
    Unpause,
    AddOnArcStateChange,
    RemoveOnArcStateChange
  }

  companion object {
    const val ACTION_HOST_INTENT = "arcs.android.host.ARC_HOST"
    private const val EXTRA_ARCHOST_HOSTID = "HOST_ID"
    const val EXTRA_ARCSTATE_CHANGED_ARCID = "ARCSTATE_CHANGED_ARCID"
    const val EXTRA_ARCSTATE_CHANGED_CALLBACKID = "ARCSTATE_CHANGED_CALLBACKID"
    const val EXTRA_ARCSTATE_CHANGED_ARCSTATE = "ARCSTATE_CHANGED_ARCSTATE"
    private const val EXTRA_OPERATION = "OPERATION"
    private const val EXTRA_OPERATION_ARG = "EXTRA_OPERATION_ARG"
    private const val EXTRA_OPERATION_RECEIVER = "EXTRA_OPERATION_RECEIVER"
    internal const val EXTRA_OPERATION_RESULT = "EXTRA_OPERATION_RESULT"
    internal const val EXTRA_OPERATION_EXCEPTION = "EXTRA_OPERATION_EXCEPTION"
    internal const val EXTRA_OPERATION_EXCEPTION_STACKTRACE =
      "EXTRA_OPERATION_EXCEPTION_STACKTRACE"

    internal fun createArcHostIntent(
      operation: Operation,
      component: ComponentName,
      hostId: String,
      argument: Parcelable?
    ): Intent = Intent(ACTION_HOST_INTENT)
      .setComponent(component)
      .putExtra(EXTRA_OPERATION, operation.ordinal)
      .putExtra(EXTRA_OPERATION_ARG, argument)
      .putExtra(EXTRA_ARCHOST_HOSTID, hostId)

    /**
     * Used by callers to specify a callback [ResultReceiver] for an [Intent] to be invoked
     * with a result after an [ACTION_HOST_INTENT] is processed.
     */
    fun setResultReceiver(intent: Intent, receiver: ResultReceiver?) =
      intent.putExtra(EXTRA_OPERATION_RECEIVER, receiver)

    @VisibleForTesting
    fun getStringResult(resultData: Bundle?) = resultData?.getString(EXTRA_OPERATION_RESULT)

    @VisibleForTesting
    fun getExceptionResult(resultData: Bundle?) = ArcHostException(
      resultData?.getString(EXTRA_OPERATION_EXCEPTION)!!,
      resultData.getString(EXTRA_OPERATION_EXCEPTION_STACKTRACE)!!
    )

    @VisibleForTesting
    fun getParticleIdentifierListResult(resultData: Bundle?): List<ParticleIdentifier> =
      resultData?.getParcelableArrayList<ParcelableParticleIdentifier>(
        EXTRA_OPERATION_RESULT
      )?.map { it.actual } ?: listOf()
  }
}

private fun Int.toOperation(): ArcHostHelper.Operation? =
  ArcHostHelper.Operation.values().getOrNull(this)

/** Return a [ComponentName] given the [KClass] of a [Service]. */
@VisibleForTesting
fun KClass<out Service>.toComponentName(context: Context) = ComponentName(context, this.java)

/** Create a wrapper around a [Service] to invoke it's internal [ArcHostHelper] via [Intent]s. */
fun Service.toArcHost(context: Context, hostId: String, sender: (Intent) -> Unit) =
  IntentArcHostAdapter(this::class.toComponentName(context), hostId, sender)

/**
 * Create a wrapper around a [ServiceInfo] to invoke the associate [Service]'s internal
 * [ArcHostHelper] via [Intent]s.
 **/
fun ServiceInfo.toRegistryHost(sender: (Intent) -> Unit) =
  IntentRegistryAdapter(ComponentName(this.packageName, this.name), sender)

/**
 * Creates an [Intent] to invoke [ArcHost.registeredParticles] on a [Service]'s internal [ArcHost].
 */
fun ComponentName.createGetRegisteredParticlesIntent(hostId: String): Intent =
  ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.GetRegisteredParticles,
    this,
    hostId,
    null
  )

/**
 * Creates an [Intent] to invoke [ArcHost.pause] on a [Service]'s internal [ArcHost].
 */
fun ComponentName.createPauseArcHostIntent(hostId: String): Intent =
  ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.Pause,
    this,
    hostId,
    null
  )

/**
 * Creates an [Intent] to invoke [ArcHost.unpause] on a [Service]'s internal [ArcHost].
 */
fun ComponentName.createUnpauseArcHostIntent(hostId: String): Intent =
  ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.Unpause,
    this,
    hostId,
    null
  )

/**
 * Creates an [Intent] to invoke [ArcHostHelper.availableHosts] on a [Service] containing an
 * [ArcHostHelper].
 */
fun ComponentName.createAvailableHostsIntent(): Intent =
  ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.AvailableHosts,
    this,
    "",
    null
  )

/**
 * Creates an [Intent] to invoke [ArcHost.startArc] on a [Service]'s internal [ArcHost].
 */
fun Plan.Partition.createStartArcHostIntent(service: ComponentName, hostId: String): Intent =
  ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.StartArc,
    service,
    hostId,
    this.toParcelable()
  )

/**
 * Creates an [Intent] to invoke [ArcHost.lookupArcStatus] on a [Service]'s internal [ArcHost].
 */
fun Plan.Partition.createLookupArcStatusIntent(service: ComponentName, hostId: String): Intent =
  ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.LookupArcStatus,
    service,
    hostId,
    this.toParcelable()
  )

/**
 * Creates an [Intent] to invoke [ArcHost.stopArc] on a [Service]'s internal [ArcHost].
 */
fun Plan.Partition.createStopArcHostIntent(service: ComponentName, hostId: String): Intent =
  ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.StopArc,
    service,
    hostId,
    this.toParcelable()
  )

/**
 * Creates an [Intent] to invoke [ArcHost.addOnArcStateChange] on a [Service]'s internal [ArcHost].
 */
fun ComponentName.createAddOnArcStateChangeIntent(
  hostId: String,
  arcId: ArcId,
  receiver: ResultReceiver
): Intent {
  return ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.AddOnArcStateChange,
    this,
    hostId,
    receiver
  ).also {
    it.putExtra(ArcHostHelper.EXTRA_ARCSTATE_CHANGED_ARCID, arcId.toString())
  }
}

/**
 * Creates an [Intent] to invoke [ArcHost.removeOnArcStateChange] on a [Service]'s internal
 * [ArcHost].
 */
fun ComponentName.createRemoveOnArcStateChangeIntent(
  hostId: String,
  registration: ArcStateChangeRegistration,
  receiver: ResultReceiver
): Intent {
  return ArcHostHelper.createArcHostIntent(
    ArcHostHelper.Operation.AddOnArcStateChange,
    this,
    hostId,
    receiver
  ).also {
    it.putExtra(ArcHostHelper.EXTRA_ARCSTATE_CHANGED_CALLBACKID, registration.toString())
  }
}
