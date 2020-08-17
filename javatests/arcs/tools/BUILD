load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_manifest")

licenses(["notice"])

# Test case for policy_test, which exercises the policy_test BUILD rules and
# the VerifyPolicy binary.
arcs_manifest(
    name = "policy_testcase",
    srcs = ["policy_testcase.arcs"],
    policy_options = "options.textproto",
    policy_test = True,
)
