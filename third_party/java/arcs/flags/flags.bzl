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
        status = "READY",
        stopwords = [
            "remove.?by.?query",
            "remove.?query.?collection.?handle",
        ],
    ),
    arcs_build_flag(
        name = "storage_service_ng",
        desc = "Storage service migration to use storage channel",
        bug_id = "b/174199081",
        status = "READY",
        stopwords = [
            "storage.?service.?ng",
        ],
    ),
    arcs_build_flag(
        name = "storage_string_reduction",
        desc = "Reduction of size of storage keys/ids",
        bug_id = "b/179216388",
        status = "READY",
        stopwords = [
            "storage.?string.?reduction",
        ],
    ),
    arcs_build_flag(
        name = "direct_store_muxer_lru_ttl",
        desc = "Expire stores in the muxer cache after a ttl",
        bug_id = "b/179046054",
        status = "READY",
        stopwords = [
            "direct.?store?.muxer.?lru?.ttl",
        ],
    ),
    arcs_build_flag(
        name = "nullable_value_support",
        desc = "Support returning nullable values",
        bug_id = "b/174115805",
        status = "READY",
        stopwords = [
            "nullable.?value.?support",
            "NullableOf",
        ],
    ),
    arcs_build_flag(
        name = "write_only_storage_stack",
        desc = "Optimized write-only storage stack.",
        bug_id = "b/181723292",
        status = "NOT_READY",
        stopwords = [
            "write.?only.?storage.?stack",
            "DatabaseOp",
        ],
    ),
    arcs_build_flag(
        name = "batch_container_store_ops",
        bug_id = "b/182508100",
        desc = "Batch container store ops in ref mode store for improved performance.",
        status = "READY",
        stopwords = [
            "batch.?container.?store.?ops",
        ],
    ),
    arcs_build_flag(
        name = "reference_mode_store_fixes",
        desc = "Resolve several reference mode store bugs",
        bug_id = "b/184008372",
        status = "READY",
        stopwords = [
            "reference.?mode.?store.?fixes",
        ],
    ),
    arcs_build_flag(
        name = "storage_key_reduction",
        desc = "Reduce storage size of storage keys",
        bug_id = "b/179216769",
        status = "NOT_READY",
        stopwords = [
            "storage.?key.?reduction",
        ],
    ),
    arcs_build_flag(
        name = "transaction_free_reads",
        desc = "Remove transaction from getEntity in DatabaseImpl",
        bug_id = "b/175140645",
        status = "READY",
        stopwords = [
            "transaction.?free.?reads",
        ],
    ),
]

validate_flag_list(ARCS_BUILD_FLAGS)
