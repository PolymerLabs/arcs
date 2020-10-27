load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "java_library",
)
load(
    "//third_party/java/arcs/flags:build_defs.bzl",
    "arcs_build_flag",
    "generate_default_build_flags",
)

licenses(["notice"])

# Flags defined for these unit tests.
TEST_BUILD_FLAGS = [
    arcs_build_flag(
        name = "feature_enabled_by_default",
        bug_id = "N/A - unit test only",
        default_value = True,
        desc = "Test feature: enabled by default",
    ),
    arcs_build_flag(
        name = "feature_disabled_by_default",
        bug_id = "N/A - unit test only",
        default_value = False,
        desc = "Test feature: disabled by default",
    ),
]

generate_default_build_flags(
    name = "default_test_build_flags_src",
    out = "DefaultTestBuildFlags.java",
    class_name = "DefaultTestBuildFlags",
    flags = TEST_BUILD_FLAGS,
)

java_library(
    name = "default_test_build_flags",
    srcs = [":default_test_build_flags_src"],
)

arcs_kt_jvm_test_suite(
    name = "default_flags_test_lib",
    srcs = ["DefaultFlagsTest.kt"],
    package = "arcs.flags",
    deps = [
        ":default_test_build_flags",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
