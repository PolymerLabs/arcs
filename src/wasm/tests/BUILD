load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_manifest_json",
    "arcs_ts_test",
)
load("//third_party/java/arcs/build_defs/internal:plan.bzl", "recipe2plan")

exports_files(["manifest.arcs"])

filegroup(
    name = "manifest_srcs",
    srcs = ["manifest.arcs"],
)

arcs_ts_test(
    name = "wasm-api-test",
    src = "wasm-api-test.ts",
    deps = [
        ":manifest_srcs",
        "//javatests/arcs/sdk/wasm:test-module",
        "//src/wasm/cpp/tests:test-module",
    ],
)

arcs_manifest_json(
    name = "manifest_data",
    src = "manifest.arcs",
)

# TODO(alxr): Remove, or find a better test location.
recipe2plan(
    name = "test_rule",
    srcs = ["manifest.arcs"],
    package = "arcs.tools.test",
)
