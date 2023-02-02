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

package arcs.core.data.expression

import arcs.core.data.RawEntity
import arcs.core.data.Reference
import arcs.core.data.util.ReferencablePrimitive
import kotlinx.coroutines.runBlocking

/**
 * Provides a [Expression.Scope] capable of looking up fields in a [RawEntity], optionally
 * dereferencing an entity by reference.
 */
class RawEntityScope(val rawEntity: RawEntity) : Expression.Scope {
  override val scopeName: String = "<RawEntity>"

  @Suppress("UNCHECKED_CAST")
  override fun <T> lookup(param: String): T {
    if (param == "creationTime()") {
      return rawEntity.creationTimestamp as T
    }
    if (param == "expirationTime()") {
      return rawEntity.expirationTimestamp as T
    }
    val referencable =
      rawEntity.allData.find { (name, _) -> name == param } ?: throw IllegalArgumentException(
        "Unknown field $param"
      )

    return when (val value = referencable.value) {
      is ReferencablePrimitive<*> -> {
        value.value as T
      }
      is Reference<*> -> {
        // TODO: Make expression evaluation suspendable?
        runBlocking {
          RawEntityScope(value.dereference() as RawEntity) as T
        }
      }
      else -> throw IllegalArgumentException("Unknown lookup result $value")
    }
  }

  override fun builder(subName: String?) = object : Expression.Scope.Builder {
    override fun set(param: String, value: Any?): Expression.Scope.Builder {
      return this
    }

    override fun build(): Expression.Scope = this@RawEntityScope
  }

  override fun properties(): Set<String> = rawEntity.allData.map {
      (name, _) -> name
  }.toSet()
}

/** Turn a [RawEntity] into a [Expression.Scope]. */
fun RawEntity.asScope() = RawEntityScope(this)
