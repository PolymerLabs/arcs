load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "builder",
    package = "arcs.core.policy.builder",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data/builder:annotation_builder",
        "//java/arcs/core/policy",
        "//java/arcs/core/policy/builder",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)
