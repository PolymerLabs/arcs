licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary")

android_binary(
    name = "demo",
    srcs = glob(["*.java"]),
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    dexopts = [
        "--min-sdk-version=29",
        "--target-sdk-version=29",
    ],
    licenses = ["notice"],
    deps = [
        "//javaharness/java/arcs/android/api",
        "//javaharness/java/arcs/android/client",
        "//javaharness/java/arcs/android/impl",
        "//javaharness/java/arcs/android/service",
        "//javaharness/java/arcs/api:api-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
