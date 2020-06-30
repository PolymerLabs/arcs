load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_gen",
    "arcs_manifest_parse_test",
)
load("//tools/build_defs/android:rules.bzl", "android_binary")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "manifest",
    srcs = ["person.arcs"],
)

arcs_manifest_parse_test(
    name = "manifest_test",
    srcs = ["person.arcs"],
    deps = glob(["*.kt"]),
)

arcs_kt_android_library(
    name = "demo_lib",
    testonly = 1,
    srcs = glob(["*.kt"]),
    manifest = ":AndroidManifest.xml",
    resource_files = glob(["res/**/*"]),
    deps = [
        ":manifest",
        "//java/arcs/android/host",
        "//java/arcs/android/sdk/host",
        "//java/arcs/android/storage/database",
        "//java/arcs/android/util",
        "//java/arcs/core/allocator",
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//java/arcs/jvm/util",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//java/arcs/sdk/storage",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/lifecycle",
        "//third_party/java/androidx/work",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_android",
    ],
)

# Use this cmd to install:
# bazel mobile-install java/arcs/android/demo
android_binary(
    name = "demo",
    testonly = 1,
    dexopts = ["--force-jumbo"],
    incremental_dexing = 0,
    manifest = ":AndroidManifest.xml",
    multidex = "native",
    deps = [":demo_lib"],
)
