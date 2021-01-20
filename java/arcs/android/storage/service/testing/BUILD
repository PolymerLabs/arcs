load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_library(
    name = "testing",
    testonly = True,
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/crdt:crdt_exception_android_proto",
        "//java/arcs/android/storage/service",
        "//java/arcs/android/storage/service:aidl",
        "//java/arcs/android/util",
        "//java/arcs/core/util/statistics",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
