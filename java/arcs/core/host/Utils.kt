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
package arcs.core.host

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.type.Type
import kotlin.reflect.KClass

/**
 * [KClass.java] and [KClass.qualifiedName] are not accessible in JS, which means they cannot be
 * used in shared code. This is a multiplatform workaround that uses toString() to obtain the
 * internal class name and replaces inner-class '$' separators with '.'.
 *
 * TODO: replace with official mechanisms once Kotlin Multiplatform's Kotlin-Reflect improves.
 */
fun KClass<*>.className(): String {
    // format is "interface|class|enum foo.bar.Bar$Inner<Type> (error messages)"
    return this.toString()
        .substringAfter(' ')
        .substringBefore(' ')
        .substringBefore('<')
        .replace('$', '.')
}

/** Returns a pair mapping [ParticleIdentifier] to [ParticleConstructor] */
inline fun <reified T : Particle> (() -> T).toRegistration(): ParticleRegistration =
    T::class.toParticleIdentifier() to suspend { this.invoke() }

/**
 * If this Type represents a [SingletonType], [CollectionType], or [EntityType], return the
 * [Schema] used by the underlying [Entity] that this type represents.
 */
fun Type.toSchema(): Schema {
    when (this) {
        is SingletonType<*> -> if (this.containedType is EntityType) {
            return (this.containedType as EntityType).entitySchema
        }
        is CollectionType<*> -> if (this.collectionType is EntityType) {
            return (this.collectionType as EntityType).entitySchema
        }
        is EntityType -> return this.entitySchema
        else -> Unit
    }
    throw IllegalArgumentException("Can't get entitySchema of unknown type $this")
}

/**
* If this Type represents a [SingletonType], [CollectionType], or [EntityType], return the
* [Schema.hash] used by the underlying [Entity] that this type represents.
*/
fun Type.toSchemaHash(): String = this.toSchema().hash
