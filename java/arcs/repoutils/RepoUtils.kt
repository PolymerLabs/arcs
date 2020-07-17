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
package arcs.repoutils

// This file contains repository specific-code.
// The main use case is code that's different between GitHub and Google internal repo.
// Whenever you change this fine, keep in mind the change needs to be managed between repos.

// A prefix that ought to be added when reading test data in Bazel-run tests.
fun runfilesDir() = ""
