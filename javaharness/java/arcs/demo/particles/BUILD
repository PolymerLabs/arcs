licenses(["notice"])

package(default_visibility = ["//javaharness/java/arcs:__subpackages__"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "particles-android",
    srcs = glob([
        "*.java",
    ]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    deps = [
        "//javaharness/java/arcs/api:api-android",
        "//javaharness/java/arcs/demo/services:services-android",
        "@com_google_dagger",
        "@javax_inject_source//jar",
    ],
)
