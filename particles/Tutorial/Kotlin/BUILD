load("//build_defs:build_defs.bzl", "arcs_kt_schema", "arcs_ts_test")
load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")


#arcs_kt_schema(
#    name = "wasm_schemas",
#    src = "Harness.arcs",
#    out = "Entities.kt",
#)

kt_wasm_binary(
    name = "hello_world",
    srcs = ["1_HelloWorld/HelloWorld.kt"],
    entry_point = "arcs.main",
    deps = ["//src/wasm/kotlin:arcs"],
)
