load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "android_proto_library",
    "java_proto_library",
    "proto_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_library(
    name = "proto",
    srcs = glob(
        ["*.kt"],
    ),
    deps = [
        ":recipe_java_proto_lite",
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
        ":recipe_java_proto",
        "//java/arcs/core/data",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
    ],
)

proto_library(
    name = "recipe_proto",
    srcs = ["recipe.proto"],
)

android_proto_library(
    name = "recipe_java_proto_lite",
    deps = [":recipe_proto"],
)

java_proto_library(
    name = "recipe_java_proto",
    deps = [":recipe_proto"],
)
