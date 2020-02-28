load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
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
        ":recipe_java_proto",
        "//java/arcs/core/data",
    ],
)

proto_library(
    name = "recipe_proto",
    srcs = ["recipe.proto"],
)

java_proto_library(
    name = "recipe_java_proto",
    deps = [":recipe_proto"],
)
