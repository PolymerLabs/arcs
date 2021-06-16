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
        name = "transaction_free_reads",
        desc = "Remove transaction from getEntity in DatabaseImpl",
        bug_id = "b/175140645",
        status = "NOT_READY",
        stopwords = [
            "transaction.?free.?reads",
        ],
    ),
]

validate_flag_list(ARCS_BUILD_FLAGS)
