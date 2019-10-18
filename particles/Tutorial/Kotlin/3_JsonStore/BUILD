load("//build_defs:build_defs.bzl", "arcs_manifest", "arcs_kt_particle", "arcs_kt_wasm_binary")

arcs_manifest(
    name = "store_schemas",
    srcs = ["JsonStore.arcs"],
)

arcs_kt_particle(
    name = "json_store_lib",
    srcs = ["JsonStore.kt"],
    deps = [":store_schemas"]
)

arcs_kt_wasm_binary(
   name = "JsonStore",
   deps = [":json_store_lib"]
)
