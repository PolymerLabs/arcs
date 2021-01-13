load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_library(
    name = "testutil",
    testonly = 1,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/sdk/android/storage/service",
        "//third_party/java/androidx/work",
        "//third_party/java/robolectric",
        "//third_party/kotlin/kotlinx_atomicfu",
    ],
)
