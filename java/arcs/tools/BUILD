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
    srcs = ["VerifyPolicy.kt"],
    deps = [
        "//java/arcs/core/analysis",
        "//java/arcs/core/data",
        "//java/arcs/core/data/proto",
        "//java/arcs/core/data/proto:manifest_java_proto_lite",
        "//java/arcs/core/data/proto:policy_java_proto_lite",
        "//java/arcs/core/policy",
        "//java/arcs/core/policy/proto",
        "//third_party/kotlin/clikt",
    ],
)

java_binary(
    name = "verify_policy",
    main_class = "arcs.tools.VerifyPolicyKt",
    runtime_deps = [":verify_policy_lib"],
)

kt_jvm_library(
    name = "recipe2plan_lib",
    srcs = [
        "Recipe2Plan.kt",
    ],
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//third_party/java/arcs/deps:protobuf_java",
        "//third_party/kotlin/clikt",
        "//third_party/kotlin/kotlinpoet",
    ],
)

java_binary(
    name = "recipe2plan",
    main_class = "arcs.tools.Recipe2PlanKt",
    runtime_deps = [":recipe2plan_lib"],
)
