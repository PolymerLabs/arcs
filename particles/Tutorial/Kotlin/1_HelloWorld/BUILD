load("//build_defs:build_defs.bzl", "arcs_manifest", "arcs_kt_particle", "arcs_kt_wasm_binary")

arcs_kt_particle(
    name = "hello_world_lib",
    srcs = ["HelloWorld.kt"],
)

arcs_kt_wasm_binary(
   name = "HelloWorld",
   deps = [":hello_world_lib"]
)
