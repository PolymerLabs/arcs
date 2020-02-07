load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")
load("//tools/build_defs/android:rules.bzl", "android_binary")
load("//tools/build_defs/android:rules.bzl", "android_device")

filegroup(
    name = "emulator_images_android_16_x86",
    srcs = glob(["androidsdk/system-images/android-16/**"]),
)

android_binary(
    name = "service_store_e2e_bin",
    testonly = 1,
    manifest = "AndroidManifest.xml",
)

android_binary(
    name = "service_store_e2e_test",
    testonly = 1,
    instruments = ":service_store_e2e_bin",
    manifest = "AndroidManifest.xml",
)

kt_android_library(
    name = "service_store_e2e_lib",
    testonly = 1,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/android/storage/service",
        "//third_party/android/androidx_test/runner",
    ]
)

android_instrumentation_test(
    name = "e2e",
    target_device = "@android_test_support//tools/android/emulated_devices/pixel_2:google_28_x86",
    test_app = ":service_store_e2e_test",
    testonly = 1,
)
