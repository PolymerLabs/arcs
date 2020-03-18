load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_schema")
load("//tools/build_defs/android:rules.bzl", "android_binary")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_schema(
    name = "schemas",
    srcs = [
        "person.arcs",
    ],
)

kt_android_library(
    name = "demo_lib",
    srcs = glob(["*.kt"]),
    manifest = ":AndroidManifest.xml",
    resource_files = glob(["res/**/*"]),
    deps = [
        ":schemas",
        "//java/arcs/android/host",
        "//java/arcs/android/sdk/host",
        "//java/arcs/android/storage/database",
        "//java/arcs/android/storage/handle",
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
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//java/arcs/jvm/util",
        "//java/arcs/sdk/android/dev/api:api-android",
        "//java/arcs/sdk/android/dev/service",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//java/arcs/sdk/storage",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/lifecycle",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_android",
    ],
)

# Use this cmd to intall:
# bazel mobile-install --noincremental_dexing java/arcs/android/demo
android_binary(
    name = "demo",
    manifest = ":AndroidManifest.xml",
    multidex = "native",
    incremental_dexing = 0,
    deps = [":demo_lib"],
)
