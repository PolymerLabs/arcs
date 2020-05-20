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
package arcs.schematests.joins

// This file acts as a test that particle reading tuples can be generated and compiled.
class TupleReader : AbstractReader() {

    suspend fun typeChecking() {
        handles.data.fetchAll().forEach { tuple ->
            val product = checkNotNull(tuple.first.dereference())
            product.name
            product.photo

            val review = checkNotNull(tuple.second.dereference())
            review.author
            review.content
            review.rating

            val manufacturer = checkNotNull(tuple.third.dereference())
            manufacturer.name
            manufacturer.address
        }
    }
}
