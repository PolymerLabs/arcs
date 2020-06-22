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
    name = "generated",
    srcs = [
        ":golden.h",
        ":golden-kt_GeneratedSchemas.jvm.kt",
        ":golden_GeneratedSchemas.jvm.kt",
        ":golden_GeneratedSchemas.wasm.kt",
        ":golden_TestHarness.kt",
    ],
)

arcs_cc_schema(
    name = "cc_schemas",
    src = "golden.arcs",
)

arcs_kt_schema(
    name = "kt_only_schemas",
    srcs = ["golden_kt.arcs"],
    platforms = [
        "jvm",
        "wasm",
    ],
)

arcs_kt_schema(
    name = "kt_schemas",
    srcs = ["golden.arcs"],
    platforms = [
        "jvm",
        "wasm",
    ],
)

arcs_ts_test(
    name = "schema-generator-test",
    src = "schema-generator-test.ts",
    deps = [
        ":generated",
        ":goldens",
    ],
)

