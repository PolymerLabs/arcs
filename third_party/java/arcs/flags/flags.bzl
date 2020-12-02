"""Defines all Arcs build flags."""

load(":arcs_build_flag.bzl", "arcs_build_flag", "validate_flag_list")

ARCS_BUILD_FLAGS = [
    arcs_build_flag(
        name = "example_feature_1",
        desc = "No-op build flag for testing",
        bug_id = "b/171530579",
        status = "READY",
        stopwords = [
            "example.?feature.?1",
        ],
    ),
    arcs_build_flag(
        name = "example_feature_2",
        desc = "No-op build flag for testing",
        bug_id = "b/171530579",
        status = "NOT_READY",
        stopwords = [
            "example.?feature.?2",
        ],
        required_flags = [
            "example_feature_1",
        ],
    ),
    arcs_build_flag(
        name = "entity_handle_api",
        desc = "EntityHandle API and supporting code in the storage stack",
        bug_id = "b/162747024",
        status = "NOT_READY",
        stopwords = [
            "entity.?handle.?api",
            "muxed.?storage",
        ],
    ),
    arcs_build_flag(
        name = "remove_by_query_handle",
        desc = "Enable the removeByQuery methods on Handles.",
        bug_id = "b/169727261",
        status = "NOT_READY",
        stopwords = [
            "remove.?by.?query",
            "remove.?query.?collection.?handle",
        ],
    ),
]

validate_flag_list(ARCS_BUILD_FLAGS)
