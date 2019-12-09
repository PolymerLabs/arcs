"""Re-exports some "native" build rules.

Use these in Arcs instead of loading them from the external repos directly.
"""

load(
    "@rules_java//java:defs.bzl",
    _java_library = "java_library",
    _java_plugin = "java_plugin",
    _java_test = "java_test",
)

java_library = _java_library

java_plugin = _java_plugin

java_test = _java_test
