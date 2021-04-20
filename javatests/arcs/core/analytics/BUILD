load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "analytics",
    size = "small",
    package = "arcs.core.analytics",
    deps = [
        "//java/arcs/core/analytics",
        "//java/arcs/core/common",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
