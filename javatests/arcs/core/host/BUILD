load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)
licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
  name = "host",
  package = "arcs.core.host",
  srcs = ["ParticleRegistrationTest.kt"],
  deps = [":particle",  "//third_party/java/junit",
                               "//third_party/java/truth",
                               "@com_github_jetbrains_kotlin//:kotlin-stdlib-jdk8"]
)

kt_jvm_library(
    name = "particle",
    srcs = glob(["*.kt"], exclude = ["ParticleRegistrationTest.kt"]),
    deps = [
        "//third_party/java/auto:auto_service",
        "//java/arcs/core/sdk:sdk",
        "//java/arcs/core/host",
    ],
)

