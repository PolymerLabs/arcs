load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_manifest_proto")

package(default_visibility = ["//visibility:public"])

licenses(["notice"])

INVALID_MANIFESTS = [
    "fail_check_multiple_or_tags",
    "fail_different_tag",
    "fail_no_tags",
    "fail_not_tag_cancels",
    "fail_not_tag_claim",
    "fail_negated_tag_present",
    "fail_read_write_mismatch_claim_check",
    "fail_multiple_inputs_one_untagged",
    "fail_multiple_checks",
    "fail_no_inputs",
    "fail_mixer",
]

VALID_MANIFESTS = [
    "ok_directly_satisfied",
    "ok_not_tag_claim_no_checks",
    "ok_not_tag_claim_reclaimed",
    "ok_negated_missing_tag",
    "ok_read_write_match_claim_check",
    "ok_multiple_inputs_correct_tags",
    "ok_claim_propagates",
    "ok_claim_not_overriden_later",
    "ok_check_multiple_and_single_claim",
    "ok_check_multiple_or_single_claim",
    "ok_check_multiple_or_tags",
]

ALL_MANIFESTS = VALID_MANIFESTS + INVALID_MANIFESTS

filegroup(
    name = "example_manifest_protos",
    srcs = [":%s" % m for m in ALL_MANIFESTS],
)

[arcs_manifest_proto(
    name = manifest,
    src = "%s.arcs" % manifest,
) for manifest in ALL_MANIFESTS]
