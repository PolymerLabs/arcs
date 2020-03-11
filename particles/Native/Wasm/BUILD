load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_cc_schema",
    "arcs_kt_particles",
    "arcs_kt_schema",
    "arcs_manifest",
    "arcs_manifest_bundle",
)
load(
    "//third_party/java/arcs/build_defs/emscripten:build_defs.bzl",
    "cc_wasm_binary",
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
    srcs = [
        "Harness.arcs",
        "Services.arcs",
    ],
)

arcs_kt_particles(
    name = "service_particle",
    srcs = ["source/ServiceParticle.kt"],
    package = "arcs",
    platforms = ["wasm"],
    deps = [":wasm_schemas"],
)

arcs_kt_particles(
    name = "test_particle",
    srcs = ["source/TestParticle.kt"],
    package = "arcs",
    platforms = ["wasm"],
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
    visibility = ["//visibility:public"],
    deps = [
        ":example_manifest",
        ":harness_manifest",
    ],
)
