load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_schema",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_schema(
    name = "join_schema_gen",
    srcs = ["Join.arcs"],
)

arcs_kt_jvm_library(
    name = "particles",
    testonly = 1,
    srcs = ["TupleReader.kt"],
    deps = [
        ":join_schema_gen",
        "//java/arcs/core/entity"
    ],
)
