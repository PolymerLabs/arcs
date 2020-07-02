load("//third_party/java/arcs/build_defs/internal:kotlin.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# The `testutil` library can be JVM-only, since our unit tests are run on the JVM.
arcs_kt_jvm_library(
    name = "testutil",
    testonly = True,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/data/proto",
        "//java/arcs/repoutils",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
