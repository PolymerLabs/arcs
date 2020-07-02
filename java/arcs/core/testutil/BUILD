load("//third_party/java/arcs/build_defs/internal:kotlin.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# The `testutil` library can be JVM-only, since our unit tests are run on the JVM.
# This is the java_proto_lite variant of this library. A java_proto variant is below (you can't mix
# the two).
arcs_kt_jvm_library(
    name = "testutil",
    testonly = True,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/data/proto",
        "//java/arcs/core/data/proto:manifest_java_proto_lite",
        "//java/arcs/repoutils",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

# java_proto variant of the above library.
arcs_kt_jvm_library(
    name = "testutil_java_proto",
    testonly = True,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/data/proto:proto_for_test",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/repoutils",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
