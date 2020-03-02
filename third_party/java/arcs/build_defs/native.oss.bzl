"""Re-exports some "native" build rules.

Use these in Arcs instead of loading them from the external repos directly.
"""

load(
    "@rules_java//java:defs.bzl",
    _java_library = "java_library",
    _java_lite_proto_library = "java_lite_proto_library",
    _java_plugin = "java_plugin",
    _java_proto_library = "java_proto_library",
    _java_test = "java_test",
)
load("@rules_proto//proto:defs.bzl", _proto_library = "proto_library")
load(
    "@rules_proto_grpc//android:defs.bzl",
    _android_proto_library = "android_proto_library",
)

java_library = _java_library

java_plugin = _java_plugin

java_test = _java_test

proto_library = _proto_library

java_proto_library = _java_proto_library

java_lite_proto_library = _java_lite_proto_library

android_proto_library = _android_proto_library
