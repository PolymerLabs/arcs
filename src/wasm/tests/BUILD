load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_serialize_manifest",
    "arcs_ts_test",
)

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

arcs_serialize_manifest(
    name = "manifest_proto",
    src = "manifest.arcs",
)
