load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "java_binary",
)
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages-tools"])

kt_jvm_library(
    name = "decode_version_map_lib",
    testonly = True,
    srcs = ["DecodeVersionMap.kt"],
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/android/crdt:version_map_android_proto",
        "//third_party/kotlin/clikt",
    ],
)

java_binary(
    name = "decode_version_map",
    testonly = True,
    main_class = "arcs.tools.DecodeVersionMapKt",
    runtime_deps = [":decode_version_map_lib"],
)

# We use `java_test` and not `java_binary` as `run_dfa` requires testonly targets.
# This would still create a java binary.
java_binary(
    name = "run_dfa",
    testonly = True,
    main_class = "arcs.tools.RunDFAMainKt",
    runtime_deps = [
        ":run_dfa_main_lib",
        "//java/arcs/flags:unit_test_build_flags",
    ],
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
        "//third_party/kotlin/clikt",
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
    runtime_deps = [
        ":verify_policy_lib",
        "//java/arcs/flags:unit_test_build_flags",
    ],
)

kt_jvm_library(
    name = "recipe2plan_lib",
    srcs = [
        "GenerationUtils.kt",
        "PlanGenerator.kt",
        "Recipe2Plan.kt",
    ],
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/data/proto:proto_for_test",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/type",
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

kt_jvm_library(
    name = "inpsect_manifest_lib",
    srcs = ["InspectManifest.kt"],
    deps = [
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/data/proto:proto_for_test",
        "//java/arcs/core/policy/proto:java_proto",
        "//third_party/java/arcs/deps:protobuf_java",
        "//third_party/kotlin/clikt",
    ],
)

java_binary(
    name = "inspect_manifest",
    main_class = "arcs.tools.InspectManifestKt",
    runtime_deps = ["inpsect_manifest_lib"],
)

sh_binary(
    name = "stopwords",
    srcs = ["stopwords.sh"],
)
