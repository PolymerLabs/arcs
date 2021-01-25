load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
)
load("//tools/build_defs/android:rules.bzl", "android_binary")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

exports_files(
    ["AndroidManifest.xml"],
)

arcs_kt_android_library(
    name = "test_app_lib",
    testonly = 1,
    srcs = glob(["*.kt"]),
    exports_manifest = 1,
    manifest = ":AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//java/arcs/android/storage/database",
        "//java/arcs/android/util",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage-kt",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
        "//java/arcs/core/util/performance",
        "//java/arcs/jvm/util",
        "//java/arcs/sdk:sdk-kt",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/work",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

# Don't use bazel mobile-install on this target.
# Use bazel build ... && adb install ...
android_binary(
    name = "testapp",
    testonly = 1,
    dexopts = ["--force-jumbo"],
    incremental_dexing = 0,
    main_dex_proguard_specs = ["mainDexClasses.rules"],
    manifest = ":AndroidManifest.xml",
    multidex = "legacy",
    deps = [":test_app_lib"],
)
