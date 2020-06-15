load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "join_codegen",
    srcs = ["Join.arcs"],
)

arcs_kt_jvm_library(
    name = "particles",
    testonly = 1,
    srcs = ["TupleReader.kt"],
    deps = [
        ":join_codegen",
        "//java/arcs/core/entity",
    ],
)

arcs_kt_jvm_test_suite(
    name = "joins",
    srcs = glob(["*Test.kt"]),
    package = "arcs.showcase.joins",
    deps = [
        ":join_codegen",
        "//java/arcs/core/data",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
