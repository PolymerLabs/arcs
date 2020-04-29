load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_schema",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_schema(
    name = "codegen",
    srcs = ["ComputePeopleStats.arcs"],
)

arcs_kt_jvm_library(
    name = "particle",
    srcs = ["ComputePeopleStats.kt"],
    deps = [
        ":codegen",
        "//java/arcs/core/util",
        "//java/arcs/sdk",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
