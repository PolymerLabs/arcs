load("//build_defs:build_defs.bzl", "arcs_ts_test")

arcs_ts_test(
    name = "wasm-cpp-test",
    src = "tests/wasm-api-tests.ts",
    deps = ["//src/wasm/cpp/tests:schemas_srcs", "//src/wasm/cpp/tests:test-module"],
)