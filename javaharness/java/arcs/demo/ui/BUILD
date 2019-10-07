licenses(["notice"])

package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")
load("@com_google_j2cl//build_defs:rules.bzl", "j2cl_library")

android_library(
    name = "ui-android",
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

j2cl_library(
    name = "ui-j2cl",
    srcs = glob([
        "*.java",
    ]),
    deps = [
        "//javaharness/java/arcs:dagger-j2cl",
        "//javaharness/java/arcs:dagger_runtime-j2cl",
        "//javaharness/java/arcs:javax_inject-j2cl",
        "//javaharness/java/arcs/api:api-j2cl",
        "//javaharness/java/arcs/demo/services:services-j2cl",
    ],
)
