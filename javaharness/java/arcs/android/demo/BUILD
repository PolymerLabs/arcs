licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary")

android_binary(
    name = "demo",
    srcs = glob(["*.java"]),
    dexopts = [
        "--min-sdk-version=29",
        "--target-sdk-version=29",
    ],
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    licenses = ["notice"],
    manifest = "AndroidManifest.xml",
    plugins = [
        "//javaharness:dagger_compiler",
    ],
    resource_files = glob(["res/**"]),
    deps = [
        "//javaharness/java/arcs/android",
        "//javaharness/java/arcs/api:api-android",
        "@maven//:com_google_dagger_dagger",
        "@maven//:com_google_flogger_flogger_system_backend",
        "@maven//:javax_inject_javax_inject",
    ],
)
