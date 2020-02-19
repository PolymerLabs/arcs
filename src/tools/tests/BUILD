load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_cc_schema",
    "arcs_kt_schema",
    "arcs_ts_test",
)

filegroup(
    name = "goldens",
    srcs = glob(["goldens/**"]),
)

filegroup(
    name = "generated_schemas",
    srcs = [
        ":golden.h",
        ":golden_GeneratedSchemas.jvm.kt",
        ":golden_GeneratedSchemas.wasm.kt",
    ],
)

filegroup(
    name = "encoded_manifest",
    srcs = ["test-data/example.pb.bin"],
    visibility = ["//visibility:public"],
)

arcs_cc_schema(
    name = "cc_schemas",
    src = "golden.arcs",
)

arcs_kt_schema(
    name = "kt_schemas",
    srcs = ["golden.arcs"],
)

arcs_ts_test(
    name = "schema-generator-test",
    src = "schema-generator-test.ts",
    deps = [
        ":generated_schemas",
        ":goldens",
    ],
)
