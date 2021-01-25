load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)
load(
    "//third_party/java/arcs/flags:arcs_build_flag.bzl",
    "arcs_build_flag",
)
load(
    "//third_party/java/arcs/flags:generate_build_flags.bzl",
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
        name = "ready_feature_overridden_to_true",
        bug_id = "N/A - unit test only",
        desc = "Test feature: disabled by default, overridden to true",
        status = "READY",
    ),
    arcs_build_flag(
        name = "ready_feature_overridden_to_false",
        bug_id = "N/A - unit test only",
        desc = "Test feature: disabled by default, overridden to false",
        status = "READY",
    ),
    arcs_build_flag(
        name = "launched_feature",
        bug_id = "N/A - unit test only",
        desc = "Test feature: enabled by default",
        status = "LAUNCHED",
    ),
    arcs_build_flag(
        name = "launched_feature_overridden_to_true",
        bug_id = "N/A - unit test only",
        desc = "Test feature: enabled by default, overridden to true",
        status = "LAUNCHED",
    ),
    arcs_build_flag(
        name = "feature_required_by_others",
        bug_id = "N/A - unit test only",
        desc = "Test feature: required by other features",
        status = "NOT_READY",
    ),
    arcs_build_flag(
        name = "feature_with_dependency",
        bug_id = "N/A - unit test only",
        desc = "Test feature: requires another feature",
        required_flags = [
            "feature_required_by_others",
        ],
        status = "NOT_READY",
    ),
]

TEST_FLAG_OVERRIDES = {
    "ready_feature_overridden_to_true": True,
    "ready_feature_overridden_to_false": False,
    "launched_feature_overridden_to_true": True,
    # All others combinations are compile errors.
}

generate_build_flags(
    name = "dev_mode_build_flags_for_testing",
    testonly = True,
    class_name = "DevModeBuildFlagsForTesting",
    dev_mode = True,
    flag_overrides = TEST_FLAG_OVERRIDES,
    flags = TEST_BUILD_FLAGS,
)

generate_build_flags(
    name = "release_mode_build_flags_for_testing",
    testonly = True,
    class_name = "ReleaseModeBuildFlagsForTesting",
    dev_mode = False,
    flag_overrides = TEST_FLAG_OVERRIDES,
    flags = TEST_BUILD_FLAGS,
)

arcs_kt_jvm_test_suite(
    name = "flags",
    package = "arcs.flags",
    deps = [
        ":dev_mode_build_flags_for_testing",
        ":release_mode_build_flags_for_testing",
        "//java/arcs/flags:DevModeBuildFlags",
        "//java/arcs/flags/testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)
