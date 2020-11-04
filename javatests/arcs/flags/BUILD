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
        name = "not_ready_feature",
        bug_id = "N/A - unit test only",
        desc = "Test feature: enabled by default",
        status = "NOT_READY",
    ),
    arcs_build_flag(
        name = "ready_feature",
        bug_id = "N/A - unit test only",
        desc = "Test feature: disabled by default",
        status = "READY",
    ),
    arcs_build_flag(
        name = "launched_feature",
        bug_id = "N/A - unit test only",
        desc = "Test feature: disabled by default",
        status = "LAUNCHED",
    ),
]

generate_build_flags(
    name = "dev_mode_build_flags_for_testing_src",
    class_name = "DevModeBuildFlagsForTesting",
    dev_mode = True,
    flags = TEST_BUILD_FLAGS,
)

generate_build_flags(
    name = "release_mode_build_flags_for_testing_src",
    class_name = "ReleaseModeBuildFlagsForTesting",
    dev_mode = False,
    flags = TEST_BUILD_FLAGS,
)

arcs_java_library(
    name = "build_flags_for_testing",
    srcs = [
        ":dev_mode_build_flags_for_testing_src",
        ":release_mode_build_flags_for_testing_src",
    ],
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
