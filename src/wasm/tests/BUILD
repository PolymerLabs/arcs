load("//third_party/java/arcs/build_defs:arcs_ts_test.bzl", "arcs_ts_test")

exports_files(["manifest.arcs"])

filegroup(
    name = "manifest_srcs",
    srcs = ["manifest.arcs"],
)

arcs_ts_test(
    name = "wasm-api-test",
    src = "wasm-api-test.ts",
    # TODO(b/157514127): Deflake this test.
    flaky = True,
    deps = [
        ":manifest_srcs",
        "//javatests/arcs/sdk/wasm:test-module",
        "//src/wasm/cpp/tests:test-module",
    ],
)
