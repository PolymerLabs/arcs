load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "proto",
    package = "arcs.core.policy.proto",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data/proto:annotation_java_proto_lite",
        "//java/arcs/core/data/proto:policy_java_proto_lite",
        "//java/arcs/core/policy",
        "//java/arcs/core/policy/proto",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)
