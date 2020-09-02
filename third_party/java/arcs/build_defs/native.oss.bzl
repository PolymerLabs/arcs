"""Re-exports some "native" build rules.

Use these in Arcs instead of loading them from the external repos directly.
"""

load(
    "@rules_java//java:defs.bzl",
    _java_binary = "java_binary",
    _java_library = "java_library",
    _java_plugin = "java_plugin",
    _java_proto_library = "java_proto_library",
    _java_test = "java_test",
)
load("@rules_proto//proto:defs.bzl", _proto_library = "proto_library")
load(
    "@rules_proto_grpc//android:defs.bzl",
    _android_proto_library = "android_proto_library",
)

java_binary = _java_binary

java_library = _java_library

java_plugin = _java_plugin

java_test = _java_test

proto_library = _proto_library

java_proto_library = _java_proto_library

android_proto_library = _android_proto_library

# In OSS we don't have a need for python library for our protos,
# but in internal Google repo we do. Instead of adding real python dependencies
# we use this blank rule. In the internal repo we use real definition.
def py_proto_library(name, api_version, deps):
    pass
