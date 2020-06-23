load("//third_party/java/arcs/build_defs:native.oss.bzl", "java_test")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# We use `java_test` and not `java_binary` as `run_dfa` requires testonly targets.
# This would still create a java binary.
java_test(
    name = "run_dfa",
    main_class = "arcs.tools.RunDFAMainKt",
    runtime_deps = [":run_dfa_main_lib"],
)

kt_jvm_library(
    name = "run_dfa_main_lib",
    testonly = 1,
    srcs = ["RunDFAMain.kt"],
    data = ["//tools:sigh_bin"],
    deps = [
        "//java/arcs/core/analysis",
        "//java/arcs/core/data",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/data/proto:proto_for_test",
        "//third_party/java/arcs/deps:protobuf_java",
    ],
)
