load("//tools/build_defs/android:rules.bzl", "android_binary")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

android_binary(
    name = "demo",
    manifest = ":AndroidManifest.xml",
    deps = [":demo_lib"],
)

kt_android_library(
    name = "demo_lib",
    srcs = glob(["*.kt"]),
    manifest = ":AndroidManifest.xml",
    resource_files = glob(["res/**/*"]),
    deps = [
        "//java/arcs/android/util",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/lifecycle",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_android",
    ],
)
