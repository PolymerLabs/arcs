load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")
load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "host",
    srcs = ["ParticleRegistrationTest.kt"],
    package = "arcs.core.host",
    deps = [
        ":particle",
        "//third_party/java/junit",
        "//third_party/java/truth",
    ],
)

arcs_kt_jvm_library(
    name = "particle",
    srcs = glob(
        ["*.kt"],
        exclude = ["ParticleRegistrationTest.kt"],
    ),
    deps = [
        "//java/arcs/core/host",
        "//java/arcs/core/sdk",
        "//third_party/java/auto:auto_service",
    ],
)


