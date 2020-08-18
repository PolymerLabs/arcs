load("//third_party/java/arcs/build_defs:arcs_ts_test.bzl", "arcs_ts_test")

arcs_ts_test(
    name = "hotreload-integration-test",
    src = "hotreload-integration-test.ts",
    deps = [
        "//src/tests/source:schemas_srcs",
        "//src/tests/source:wasm-particle-new",
        "//src/tests/source:wasm-particle-old",
    ],
)
