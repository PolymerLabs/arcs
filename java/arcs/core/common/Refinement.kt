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

package arcs.core.common

/**
 * Representation of a refinement type for filtering data from a collection at runtime.
 *
 * Supports filtering and data validation via a predicate (optional runtime arguments).
 * e.g. when querying a collection by id, a refinement predicate such as
 * ```
 *  { value: Person, args: String -> value.id == args }
 * ```
 * could be used to filter the dataset to only retrive relevant data.
 * This allows particles to write `people.query('personid')` in their implementation code.
 */
class Refinement<EntityType>(
    val predicate: (value: EntityType, args: Any) -> Boolean
) {
    // TODO(cypher1): val toSql: (args: Any) -> String

    /** A helper method for filtering the values of a collection by the associated refinement. */
    fun filterBy(values: Set<EntityType>, args: Any): Set<EntityType> {
        return values.filter { value -> predicate(value, args) }.toSet()
    }
}
