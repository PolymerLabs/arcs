load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "api",
    srcs = glob(["*.kt"]),
    package = "arcs.core.storage.api",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/testutil",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
