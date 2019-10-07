licenses(["notice"])

package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "api-android",
    srcs = glob([
        "*.java",
    ]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    deps = [
        "//javaharness/java/arcs/android/api",
        "//javaharness/java/arcs/crdt:crdt-android",
        "@com_google_dagger",
        "@javax_inject_source//jar",
        "@org_json//jar",
    ],
)
