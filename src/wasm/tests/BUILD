load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_ts_test")

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
        "//src/wasm/cpp/tests:test-module",
        "//src/wasm/kotlin/javatests/arcs:test-module",
    ],
)
