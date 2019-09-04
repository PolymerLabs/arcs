
licenses(["notice"])

package(default_visibility = ["//java/arcs:__subpackages__",
                              "//javatests/arcs:__subpackages__"])

load("@com_google_j2cl//build_defs:rules.bzl", "j2cl_library")
load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "services-android",
    srcs = glob([
        "*.java",
    ]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    deps = [],
)

j2cl_library(
    name = "services-j2cl",
    srcs = glob([
        "*.java",
    ]),
    deps = [],
)
