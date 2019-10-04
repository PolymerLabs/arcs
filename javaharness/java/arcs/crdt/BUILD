licenses(["notice"])

package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "crdt-android",
    srcs = glob([
        "*.java",
    ]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    deps = [
      "@com_google_dagger",
      "@javax_inject_source//jar",
    ],
)
