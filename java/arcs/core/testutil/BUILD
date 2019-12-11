load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# The `testutil` library can be JVM-only, since our unit tests are run on the JVM.
kt_jvm_library(
    name = "testutil",
    testonly = True,
    srcs = glob(["*.kt"]),
    deps = [
        "//third_party/java/junit",
    ],
)
