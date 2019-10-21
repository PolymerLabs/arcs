package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

licenses(["notice"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_android_library")

licenses(["notice"])

kt_android_library(
    name = "accelerator",
    srcs = glob(["*.kt"]),
    visibility = ["//visibility:public"],
    deps = [
        "//javaharness/java/arcs/api:api-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
        "@maven//:com_beust_klaxon"
    ],
)
