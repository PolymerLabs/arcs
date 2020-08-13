load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "java_binary",
    "java_test",
)
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

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
    deps = [
        "//java/arcs/core/analysis",
        "//java/arcs/core/data",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/data/proto:proto_for_test",
        "//third_party/java/arcs/deps:protobuf_java",
    ],
)

kt_jvm_library(
    name = "verify_policy_lib",
    testonly = True,
    srcs = ["VerifyPolicy.kt"],
    deps = [
        "//java/arcs/core/analysis",
        "//java/arcs/core/data",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/data/proto:policy_java_proto",
        "//java/arcs/core/data/proto:proto_for_test",
        "//java/arcs/core/policy",
        "//java/arcs/core/policy/proto:java_proto",
        "//third_party/java/arcs/deps:protobuf_java",
        "//third_party/kotlin/clikt",
    ],
)

java_binary(
    name = "verify_policy",
    testonly = True,
    main_class = "arcs.tools.VerifyPolicyKt",
    runtime_deps = [":verify_policy_lib"],
)
