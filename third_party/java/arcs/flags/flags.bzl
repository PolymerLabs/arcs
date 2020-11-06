"""Defines all Arcs build flags."""

load(":build_defs.bzl", "arcs_build_flag")

ARCS_BUILD_FLAGS = [
    arcs_build_flag(
        name = "example_feature_1",
        desc = "No-op build flag for testing",
        bug_id = "b/171530579",
        status = "READY",
    ),
    arcs_build_flag(
        name = "example_feature_2",
        desc = "No-op build flag for testing",
        bug_id = "b/171530579",
        status = "NOT_READY",
    ),
]
