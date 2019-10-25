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

package arcs.crdt

import arcs.common.Referencable

/**
 * A [CrdtModel] capable of managing a complex entity consisting of named [CrdtSingleton]s and named
 * [CrdtSet]s, each of which can manage various types of [Referencable] data.
 *
 * ```kotlin
 * enum class Party {
 *   Democratic, Republican, Independent
 * }
 * data class PersonReference(val id: String)
 *
 * CrdtEntity.addFieldValueInterpreters(
 *   object : FieldValueInterpreter<String> {
 *     override fun getReferenceId(value: String) = value
 *     override fun serialize(value: String) = "$value".toByteArray()
 *     override fun deserialize(rawData: ByteArray) = rawData.toString()
 *   },
 *   object : FieldValueInterpreter<Int> {
 *     override fun getReferenceId(value: Int) = "$value"
 *     override fun serialize(value: Int) = "$value".toByteArray()
 *     override fun deserialize(rawData: ByteArray) = rawData.toString().toInt()
 *   },
 *   object : FieldValueInterpreter<Party> {
 *     override fun getReferenceId(value: Party) = "${value.ordinal}"
 *     override fun serialize(value: Party) = "$value".toByteArray()
 *     override fun deserialize(rawData: ByteArray) = Party.valueOf(rawData.toString())
 *   },
 *   object : FieldValueInterpreter<PersonReference> {
 *     override fun getReferenceId(value: PersonReference) = value.id
 *     override fun serialize(value: PersonReference) = "${value.id}".toByteArray()
 *     override fun deserialize(rawData: ByteArray) = PersonReference(id = rawData.toString())
 *   }
 * )
 *
 * val jason = CrdtEntity(
 *   "name" to String::class,
 *   "age" to Int::class,
 *   "politicalParty" to Party::class,
 *   // Only collection supported is MutableSet, at least until we have a CrdtModel for
 *   "friends" to MutableSet<PersonReference>::class
 * ).initialize(
 *   "Jason Feinstein",
 *   34,
 *   Party.Independent,
 *   mutableSetOf(
 *     PersonReference("BJ Esmailbegui"),
 *     PersonReference("Yusuf Simonson"),
 *     PersonReference("Michael Whidby"),
 *     PersonReference("Jason Kwon")
 *   )
 * )
 * ```
 */
class CrdtEntity {
  init {
    TODO("Not implemented yet.")
  }
}
