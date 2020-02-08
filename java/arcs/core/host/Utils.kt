package arcs.core.host

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
