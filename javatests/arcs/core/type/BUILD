load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "type",
    package = "arcs.core.type",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/type",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
