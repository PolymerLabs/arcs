load(
    "//build_defs/kotlin_native:build_defs.bzl",
    "kt_wasm_binary",
    "kt_wasm_library",
)
load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")
load(
    "//build_defs:build_defs.bzl",
    "arcs_kt_binary",
    "arcs_kt_schema",
    "arcs_cc_schema",
    "arcs_ts_test",
    "arcs_manifest",
    "arcs_manifest_bundle",
)

licenses(["notice"])

arcs_cc_schema(
    name = "example_schema",
    src = "example.arcs",
    out = "example.h",
)

cc_wasm_binary(
    name = "example_particle",
    srcs = ["source/example.cc"],
    hdrs = ["example.h"],
    deps = ["//src/wasm/cpp:arcs"],
)

arcs_kt_schema(
    name = "wasm_schemas",
    srcs = ["Harness.arcs"],
)

arcs_kt_binary(
    name = "service_particle",
    srcs = ["source/ServiceParticle.kt"],
)

arcs_kt_binary(
    name = "test_particle",
    srcs = ["source/TestParticle.kt"],
    deps = [":wasm_schemas"],
)

arcs_manifest(
    name = "example_manifest",
    srcs = ["example.arcs"],
    deps = [":example_particle"],
)

arcs_manifest(
    name = "harness_manifest",
    srcs = ["Harness.arcs"],
    deps = [":test_particle"],
)

arcs_manifest_bundle(
    name = "bundle",
    deps = [
        ":example_manifest",
        ":harness_manifest",
    ],
)
