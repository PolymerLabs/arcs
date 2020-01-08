load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_cc_schema",
    "arcs_kt_schema",
    "arcs_ts_test",
)

exports_files(["manifest.arcs"])

filegroup(
    name = "manifest_srcs",
    srcs = ["manifest.arcs"],
)

filegroup(
    name = "goldens",
    srcs = glob(["goldens/**"]),
)

arcs_cc_schema(
    name = "cc_schemas",
    src = "manifest.arcs",
)

arcs_kt_schema(
    name = "kt_schemas",
    srcs = ["manifest.arcs"],
)

filegroup(
    name = "generated_schemas",
    srcs = [
        ":manifest.h",
        ":manifest_GeneratedSchemas.kt",
    ],
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

arcs_ts_test(
    name = "schema-generator-test",
    src = "schema-generator-test.ts",
    deps = [
        ":generated_schemas",
        ":goldens",
    ],
)
