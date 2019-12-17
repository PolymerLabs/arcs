load("//tools/build_defs/android:rules.bzl", "android_binary")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

android_binary(
    name = "testapp",
    manifest = "//java/arcs/sdk/android/storage/testapp:AndroidManifest.xml",
    deps = [":testapp_lib"],
)

kt_android_library(
    name = "testapp_lib",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/sdk/android/storage/testapp:AndroidManifest.xml",
    resource_files = glob(["res/**/*"]),
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/android/storage",
        "//java/arcs/android/util",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/data",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
        "//java/arcs/sdk/android/storage",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/lifecycle",
        "//third_party/java/androidx/recyclerview",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_android",
    ],
)
