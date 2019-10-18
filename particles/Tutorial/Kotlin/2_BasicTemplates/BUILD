load("//build_defs:build_defs.bzl", "arcs_manifest", "arcs_kt_particle", "arcs_kt_wasm_binary")

arcs_kt_particle(
    name = "basic_template_lib",
    srcs = ["BasicTemplate.kt"],
)

arcs_kt_wasm_binary(
   name = "BasicTemplate",
   deps = [":basic_template_lib"]
)
