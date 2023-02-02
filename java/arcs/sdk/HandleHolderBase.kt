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
package arcs.sdk

import kotlinx.coroutines.CoroutineDispatcher

/**
 * Base class used by `schema2kotlin` code-generator tool to generate a class containing all
 * declared handles.
 */
open class HandleHolderBase(
  private val particleName: String,
  private val entitySpecs: Map<String, Set<EntitySpec<out Entity>>>
) : HandleHolder {
  val handles = mutableMapOf<String, Handle>().withDefault { handleName ->
    checkHandleIsValid(handleName)
    throw NoSuchElementException(
      "Handle $handleName has not been initialized in $particleName yet."
    )
  }

  override val dispatcher: CoroutineDispatcher
    get() {
      val handle = checkNotNull(handles.values.firstOrNull()) {
        "No dispatcher available for a HandleHolder with no handles."
      }
      return handle.dispatcher
    }

  override fun getEntitySpecs(handleName: String): Set<EntitySpec<out Entity>> {
    checkHandleIsValid(handleName)
    return entitySpecs.getValue(handleName)
  }

  override fun getHandle(handleName: String): Handle {
    checkHandleIsValid(handleName)
    return handles.getValue(handleName)
  }

  override fun setHandle(handleName: String, handle: Handle) {
    checkHandleIsValid(handleName)
    require(!handles.containsKey(handleName)) {
      "$particleName.$handleName has already been initialized."
    }
    handles[handleName] = handle
  }

  override fun detach() {
    handles.forEach { (_, handle) -> handle.unregisterForStorageEvents() }
  }

  override fun reset() {
    // In our current use case, we call `detach` and then reset. But in case someone using
    // the handle holder doesn't need the split detach/reset behavior, we'll call detach
    // here as well to make sure resources are cleaned up.
    detach()
    handles.forEach { (_, handle) -> handle.close() }
    handles.clear()
  }

  override fun isEmpty() = handles.isEmpty()

  private fun checkHandleIsValid(handleName: String) {
    // entitySpecs is passed in the constructor with the full set of specs, so it can be
    // considered an authoritative list of which handles are valid and which aren't.
    if (!entitySpecs.containsKey(handleName)) {
      throw NoSuchElementException(
        "Particle $particleName does not have a handle with name $handleName."
      )
    }
  }

  override suspend fun <T : Entity> createForeignReference(spec: EntitySpec<T>, id: String) =
    checkNotNull(handles.values.firstOrNull()).createForeignReference(spec, id)
}
