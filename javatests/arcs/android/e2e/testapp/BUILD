load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_gen",
)
load("//tools/build_defs/android:rules.bzl", "android_binary")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_gen(
    name = "animal_arcs",
    srcs = ["animal.arcs"],
)

arcs_kt_gen(
    name = "person_arcs",
    srcs = ["person.arcs"],
)

arcs_kt_android_library(
    name = "test_app_lib",
    testonly = 1,
    srcs = glob(["*.kt"]),
    manifest = ":AndroidManifest.xml",
    resource_files = glob(["res/**/*"]),
    deps = [
        ":animal_arcs",
        ":person_arcs",
        "//java/arcs/android/devtools",
        "//java/arcs/android/devtools:aidl",
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

android_binary(
    name = "testapp",
    dexopts = ["--force-jumbo"],
    incremental_dexing = 0,
    manifest = ":AndroidManifest.xml",
    multidex = "native",
    deps = [":test_app_lib"],
)
