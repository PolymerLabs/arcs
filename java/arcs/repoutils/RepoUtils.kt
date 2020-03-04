package arcs.repoutils

// This file contains repository specific-code.
// The main use case is code that's different between GitHub and Google internal repo.
// Whenever you change this fine, keep in mind the change needs to be managed between repos.

// A prefix that ought to be added when reading test data in Bazel-run tests.
fun runfilesDir() = ""
