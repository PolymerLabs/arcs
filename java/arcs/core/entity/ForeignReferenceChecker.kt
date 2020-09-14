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
package arcs.core.entity

import arcs.core.data.Schema
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.keys.ForeignStorageKey

/**
 * Class used to register hooks that can check the validity of external references. A check is
 *  associated with a namespace, represented by an empty Arcs schema. It checks a given id in
 * this namespace for external validity.
 */
class ForeignReferenceChecker {
    private val validityChecks = mutableMapOf<Schema, (String) -> Boolean>()

    // Registers the checker for the given spec, which acts as the namespace.
    fun registerExternalEntityType(
        spec: EntitySpec<out Entity>,
        checker: (String) -> Boolean
    ) = synchronized(this) {
        checkNoFields(spec.SCHEMA)
        validityChecks[spec.SCHEMA] = checker
    }

    // Checks the given value using the checker for the given namespace.
    fun check(namespace: Schema, value: String): Boolean = synchronized(this) {
        return checkNotNull(validityChecks[namespace]) {
            "Foreign type not registered: $namespace."
        }.invoke(value)
    }

    private fun checkNoFields(schema: Schema) {
        check(schema.fields.singletons.isEmpty() && schema.fields.collections.isEmpty()) {
            "Only empty schemas can be used for foreign references."
        }
    }
}

/**
 * Create a foreign [Reference] of type [T] with the given [id]. It does not check for validity of
 * that [id].
 *
 * Note: this is a temporary method, this functionatily will be part of the EntityHandle when we
 * have one and it is used to create references.
 */
fun <T : Entity> foreignReference(spec: EntitySpec<T>, id: String): Reference<T> {
    return Reference(
        spec,
        StorageReference(id, storageKey = ForeignStorageKey(spec.SCHEMA), version = null)
    )
}

/** Exception thrown when we attempt to create a reference to an invalid ID. */
class InvalidForeignReferenceException(message: String) : Exception(message)
