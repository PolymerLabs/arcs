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
    throw Exception("Can't get entitySchema of unknown type $this")
}

fun Type.toSchemaHash(): String = this.toSchema().hash
