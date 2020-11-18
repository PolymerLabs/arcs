load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:arcs-internal"])

arcs_kt_jvm_library(
    name = "testing",
    testonly = True,
    srcs = glob(["*.kt"]),
    exports = [
        # Export unit_test_build_flags to make deps simpler for unit tests.
        "//java/arcs/flags:unit_test_build_flags",
    ],
    deps = [
        "//java/arcs/flags:unit_test_build_flags",
        "//third_party/java/junit:junit-android",
    ],
)
