load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_ts_test")


arcs_ts_test(
    name = "wasm-api-test",
    src = "tests/wasm-api-tests.ts",
    deps = [
        "//src/wasm/cpp/tests:schemas_srcs",
        "//src/wasm/cpp/tests:test-module",
        "//src/wasm/kotlin/tests/arcs:schemas_srcs",
        "//src/wasm/kotlin/tests/arcs:test-module"
    ],
)
