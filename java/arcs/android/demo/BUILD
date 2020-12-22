load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_gen",
)
load("//tools/build_defs/android:rules.bzl", "android_binary")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_gen(
    name = "manifest",
    srcs = ["person.arcs"],
)

arcs_kt_android_library(
    name = "demo_lib",
    srcs = glob(["*.kt"]),
    manifest = ":AndroidManifest.xml",
    resource_files = glob(["res/**/*"]),
    deps = [
        ":manifest",
        "//java/arcs/android/labs/host",
        "//java/arcs/android/storage/database",
        "//java/arcs/android/util",
        "//java/arcs/core/allocator",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:driver_providers",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/util",
        "//java/arcs/jvm/util",
        "//java/arcs/sdk/android/labs/host",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/work",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

# Use this cmd to install:
# bazel mobile-install java/arcs/android/demo
android_binary(
    name = "demo",
    testonly = True,
    dexopts = ["--force-jumbo"],
    incremental_dexing = 0,
    manifest = ":AndroidManifest.xml",
    multidex = "native",
    deps = [":demo_lib"],
)
