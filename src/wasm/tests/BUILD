load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_ts_test")

filegroup(
    name = "manifest-srcs",
    srcs = ["manifest.arcs"],
    visibility = ["//visibility:public"],
)

arcs_ts_test(
    name = "wasm-api-test",
    src = "wasm-api-test.ts",
    deps = [
        ":manifest-srcs",
        "//src/wasm/cpp/tests:test-module",
        "//src/wasm/kotlin/javatests/arcs:test-module",
    ],
)
