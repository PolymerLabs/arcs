load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "statistics",
    srcs = glob(["*.kt"]),
    package = "arcs.core.util.statistics",
    deps = [
        "//java/arcs/core/util/statistics",
        "//third_party/java/junit",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)
