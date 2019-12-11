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

package arcs.core.data

/** The name (or one of several names) for a [Schema]. */
// Inline classes are still experimental, but so is wasm, so ¯\_(ツ)_/¯
@Suppress("EXPERIMENTAL_FEATURE_WARNING")
inline class SchemaName(val name: String) {
    /** Prettifies the [name] by converting things like `MyFooType` to "My Foo Type". */
    fun toPrettyString(): String =
        name.replace(LOWERCASE_UPPERCASE) { "${it.groupValues[1]} ${it.groupValues[2]}" }
            .replace(UPPERCASE_LOWERCASE) { " ${it.groupValues[1]}" }
            .replace(MULTIPLE_SPACES, " ")

    companion object {
        private val LOWERCASE_UPPERCASE = "([^A-Z])([A-Z])".toRegex(RegexOption.MULTILINE)
        private val UPPERCASE_LOWERCASE = "([A-Z][^A-Z])".toRegex(RegexOption.MULTILINE)
        private val MULTIPLE_SPACES = "\\s+".toRegex(RegexOption.MULTILINE)
    }
}
