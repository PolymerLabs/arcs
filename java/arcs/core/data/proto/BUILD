load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "android_proto_library",
    "java_proto_library",
    "proto_library",
    "py_proto_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# This target is needed in Google internal repo when running TypeScript with Bazel.
filegroup(
    name = "proto_files",
    srcs = ["manifest.proto"],
)

arcs_kt_library(
    name = "proto",
    srcs = glob(
        ["*.kt"],
    ),
    deps = [
        ":manifest_java_proto_lite",
        "//java/arcs/core/data",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
    ],
)

# This target pulls in the java protobuf library, as opposed to the *java_lite*
# protobuf library. The regular protobuf library is needed for tests.
arcs_kt_library(
    name = "proto_for_test",
    testonly = 1,
    srcs = glob(
        ["*.kt"],
    ),
    add_android_constraints = False,
    deps = [
        ":manifest_java_proto",
        "//java/arcs/core/data",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
    ],
)

proto_library(
    name = "manifest_proto",
    srcs = ["manifest.proto"],
)

android_proto_library(
    name = "manifest_java_proto_lite",
    deps = [":manifest_proto"],
)

java_proto_library(
    name = "manifest_java_proto",
    deps = [":manifest_proto"],
)

py_proto_library(
    name = "manifest_py_proto",
    api_version = 2,
    deps = [":manifest_proto"],
)
