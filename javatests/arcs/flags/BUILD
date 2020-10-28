load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_java_library",
    "arcs_kt_jvm_test_suite",
)
load(
    "//third_party/java/arcs/flags:build_defs.bzl",
    "arcs_build_flag",
    "generate_build_flags",
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

generate_build_flags(
    name = "build_flags_for_testing_src",
    class_name = "BuildFlagsForTesting",
    dev_mode = True,
    flags = TEST_BUILD_FLAGS,
)

arcs_java_library(
    name = "build_flags_for_testing",
    srcs = [":build_flags_for_testing_src"],
    constraints = ["android"],
)

arcs_kt_jvm_test_suite(
    name = "flags",
    srcs = ["BuildFlagsTest.kt"],
    package = "arcs.flags",
    deps = [
        ":build_flags_for_testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
