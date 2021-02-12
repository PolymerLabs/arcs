/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.host

import arcs.core.data.Capabilities
import arcs.core.data.Capability
import arcs.core.data.DefaultSchemaSerializer
import arcs.core.data.EntitySchemaProviderType
import arcs.core.data.SchemaSerializer
import arcs.core.entity.Entity
import arcs.core.storage.StorageKeyManager
import arcs.core.util.TaggedLog
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch

/** Serialize [ArcHostContext] to Arcs Storage. */
@ExperimentalCoroutinesApi
class StoreBasedArcHostContextSerializer(
  /**
   * When arc states change, the state changes are serialized to handles. This serialization will
   * happen asynchronously from the state change operation, on the [CoroutineContext] provided
   * here.
   */
  private val updateArcHostContextCoroutineContext: CoroutineContext,
  /**
   * Provides a [HandleManager] for creating an [ArcHostContextParticle] for use in serialization.
   */
  private val handleManagerFactory: HandleManagerFactory,
  /** A [StorageKeyManager] for creating an [ArcHostContextParticle] for use in serialization. */
  // TODO(b/174432505): Don't use the GLOBAL_INSTANCE
  private val storageKeyManager: StorageKeyManager = StorageKeyManager.GLOBAL_INSTANCE,
  /** A [SchemaSerializer] for creating an [ArcHostContextParticle] for use in serialization. */
  private val serializer: SchemaSerializer<String> = DefaultSchemaSerializer(),
  /** A set of [Capabilities] for creating an [ArcHostContextParticle] for use in serialization. */
  private val arcHostContextCapabilities: Capabilities = Capabilities(Capability.Shareable(true))
) : ArcHostContextSerializer {

  private val log = TaggedLog { "StoreBasedArcHostContextSerializer" }

  /**
   * Supports asynchronous [ArcHostContext] serializations in observed order.
   *
   * [contextSerializationJob] loops infinitely, waiting for new tasks to be queued in
   * [contextSerializationChannel] then launching them in [updateArcHostContextCoroutineContext].
   *
   * TODO: make the channel per-Arc instead of per-Host for better serialization
   *  performance under multiple running and to-be-run Arcs.
   */
  private val contextSerializationChannel: Channel<suspend () -> Unit> = Channel(Channel.UNLIMITED)

  /**
   * A job that loops infinitely, queues tasks on the [contextSerializationChannel], and then
   * launches them in the [updateArcHostContextCoroutineContext].
   */
  private val contextSerializationJob =
    CoroutineScope(updateArcHostContextCoroutineContext).launch {
      for (task in contextSerializationChannel) task()
    }

  /**
   * Deserializes [ArcHostContext] from [Entity] types read from storage by using
   * [ArcHostContextParticle].
   *
   * @param arcHostContext default context, must contain target arcId
   * @param arcHostId the identifier for the [ArcHost]
   */
  override suspend fun readContextFromStorage(
    arcHostContext: ArcHostContext,
    arcHostId: String
  ): ArcHostContext {
    val particle = createArcHostContextParticle(arcHostContext, arcHostId)
    val readContext = particle.readArcHostContext(arcHostContext)
    particle.close()

    return readContext ?: arcHostContext
  }

  /** Serializes [ArcHostContext] onto storage asynchronously or synchronously as fall-back. */
  override suspend fun writeContextToStorage(arcHostContext: ArcHostContext, arcHostId: String) {
    if (!contextSerializationChannel.isClosedForSend) {
      /** Serialize the [arcHostContext] to storage in observed order asynchronously. */
      contextSerializationChannel.send {
        writeContextToStorageInternal(
          ArcHostContext(
            arcHostContext.arcId,
            arcHostContext.particles,
            arcHostContext.arcState
          ),
          arcHostId
        )
      }
    } else {
      /** fall back to synchronous serialization. */
      writeContextToStorageInternal(arcHostContext, arcHostId)
    }
  }

  /** Waits until all observed context serializations are flushed. */
  override suspend fun drainSerializations() {
    if (!contextSerializationChannel.isClosedForSend) {
      val deferred = CompletableDeferred<Boolean>()
      contextSerializationChannel.send { deferred.complete(true) }
      deferred.await()
    }
  }

  override suspend fun cancel() {
    contextSerializationChannel.cancel()
  }

  /**
   * Creates a specialized [ArcHostContextParticle] used for serializing [ArcHostContext] state
   * to storage.
   */
  private suspend fun createArcHostContextParticle(
    arcHostContext: ArcHostContext,
    hostId: String
  ): ArcHostContextParticle {
    val handleManager = handleManagerFactory.build(arcHostContext.arcId, hostId)

    return ArcHostContextParticle(
      hostId,
      handleManager,
      storageKeyManager,
      serializer
    ).apply {
      val partition = createArcHostContextPersistencePlan(
        arcHostContextCapabilities,
        arcHostContext.arcId
      )
      partition.particles[0].handles.forEach { handleSpec ->
        createHandle(
          handleManager,
          handleSpec.key,
          handleSpec.value,
          handles,
          this.toString(),
          true,
          (handleSpec.value.handle.type as? EntitySchemaProviderType)?.entitySchema
        )
      }
    }
  }

  /**
   * Serializes [ArcHostContext] into [Entity] types generated by 'schema2kotlin', and
   * use [ArcHostContextParticle] to write them to storage under the given [hostId].
   *
   * Subclasses may override this to store the [context] using a different implementation.
   */
  private suspend fun writeContextToStorageInternal(context: ArcHostContext, hostId: String) {
    try {
      /** TODO: reuse [ArcHostContextParticle] instances if possible. */
      createArcHostContextParticle(context, hostId).run {
        writeArcHostContext(context)
        close()
      }
    } catch (e: Exception) {
      log.info { "Error serializing Arc" }
      log.debug(e) {
        """
                Error serializing $hostId, restart will reinvoke Particle.onFirstStart()
        """.trimIndent()
      }
    }
  }
}
