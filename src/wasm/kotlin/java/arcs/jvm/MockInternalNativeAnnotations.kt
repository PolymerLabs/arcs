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

package kotlin.native.internal

import kotlin.annotation.AnnotationTarget.CONSTRUCTOR
import kotlin.annotation.AnnotationTarget.FUNCTION
import kotlin.annotation.AnnotationTarget.PROPERTY_GETTER
import kotlin.annotation.AnnotationTarget.PROPERTY_SETTER

/**
 * Allows functions to be called by their given name from C++ part of runtime using C ABI.
 * The parameters are mapped in an implementation-dependent manner.
 *
 * The function to call from C++ can be a wrapper around the original function.
 *
 * If the name is not specified, the function to call will be available by its Kotlin unqualified name.
 *
 * This annotation is not intended for the general consumption and is public only for the launcher!
 */
@Target(
    FUNCTION,
    CONSTRUCTOR,
    PROPERTY_GETTER,
    PROPERTY_SETTER
)
@Retention(AnnotationRetention.BINARY)
public annotation class ExportForCppRuntime(val name: String = "")
