load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")
load("//build_defs:build_defs.bzl", "arcs_manifest", "arcs_kt_particle", "arcs_cc_schema", "arcs_ts_test", "arcs_kt_wasm_binary")


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

arcs_manifest(
    name = "wasm_schemas",
    srcs = ["Harness.arcs"],
)


arcs_kt_particle(
    name = "service_particle_lib",
    srcs = ["source/ServiceParticle.kt"],
)

arcs_kt_particle(
    name = "test_particle_lib",
    srcs = [
        "source/TestParticle.kt",
 
    ],
    deps = [    
        ":wasm_schemas",
    ]
)

arcs_kt_wasm_binary(
   name = "service_particle",
   deps = [":service_particle_lib"])


arcs_kt_wasm_binary(
   name = "test_particle",
   deps = [":test_particle_lib"])

