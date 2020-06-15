load(
    "@rules_java//java:defs.bzl",
    "java_test",
)
load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

java_test(
    name = "run_dfa",
    main_class = "arcs.core.analysis.DFATestMainKt",
    runtime_deps = [":dfa_test_main_lib"],
)

arcs_kt_jvm_library(
    name = "dfa_test_main_lib",
    testonly = 1,
    srcs = ["DFATestMain.kt"],
    deps = [
        "//java/arcs/core/analysis",
        "//java/arcs/core/data",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/data/proto:proto_for_test",
        "//third_party/java/arcs/deps:protobuf_java",
    ],
)

arcs_kt_jvm_test_suite(
    name = "analysis",
    data = [
        "//java/arcs/core/data/testdata:examples",
        "//javatests/arcs/core/analysis/testdata:example_manifest_protos",
    ],
    package = "arcs.core.analysis",
    deps = [
        "//java/arcs/core/analysis",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/data/proto:proto_for_test",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/repoutils",
        "//third_party/java/arcs/deps:protobuf_java",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)
