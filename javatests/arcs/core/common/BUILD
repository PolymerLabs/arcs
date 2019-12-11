load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "common",
    package = "arcs.core.common",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/util",
        "//third_party/java/junit",
        "//third_party/java/truth",
    ],
)
