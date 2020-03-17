load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "schemas",
    srcs = ["UnderTest.arcs"],
)

arcs_kt_jvm_library(
    name = "particle",
    srcs = ["ComputePeopleStats.kt"],
    deps = [":schemas"],
)

arcs_kt_jvm_test_suite(
    name = "test",
    srcs = ["ComputePeopleStatsTest.kt"],
    package = "arcs.unit.test.example",
    deps = [
        ":particle",
        "//java/arcs/sdk/testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
