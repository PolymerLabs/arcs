load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
    "arcs_manifest_proto",
)

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "policy",
    data = [":testdata"],
    package = "arcs.core.policy",
    deps = [
        "//java/arcs/core/analysis",
        "//java/arcs/core/data",
        "//java/arcs/core/policy",
        "//java/arcs/core/policy/proto",
        "//java/arcs/core/testutil/protoloader",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)

filegroup(
    name = "testdata",
    srcs = [":PolicyTranslationTestData"],
)

arcs_manifest_proto(
    name = "PolicyTranslationTestData",
    src = "PolicyTranslationTestData.arcs",
)
