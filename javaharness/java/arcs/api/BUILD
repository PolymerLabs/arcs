licenses(["notice"])

package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

kt_android_library(
    name = "api-android",
    srcs = glob([
        "*.java",
    ]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    deps = [
        "//src_kt/java/arcs/crdt",
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt/internal",
        "//third_party/java/dagger",
        "//third_party/java/jsr330_inject",
    ],
)
