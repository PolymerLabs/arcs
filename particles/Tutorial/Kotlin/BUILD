load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("//build_defs:build_defs.bzl", "arcs_manifest", "arcs_kt_particle", "arcs_kt_wasm_binary")

arcs_kt_particle(
    name = "hello_world_lib",
    srcs = ["1_HelloWorld/HelloWorld.kt"],
)

arcs_kt_wasm_binary(
   name = "hello_world",
   deps = [":hello_world_lib"]
)

arcs_kt_particle(
    name = "basic_template_lib",
    srcs = ["2_BasicTemplates/BasicTemplate.kt"],
)

arcs_kt_wasm_binary(
   name = "basic_template",
   deps = [":basic_template_lib"]
)

arcs_manifest(
    name = "store_schemas",
    srcs = ["3_JsonStore/JsonStore.arcs"],
)

arcs_kt_particle(
    name = "json_store_lib",
    srcs = ["3_JsonStore/JsonStore.kt",],
    deps = [":store_schemas",]
)

arcs_kt_wasm_binary(
   name = "json_store",
   deps = [":json_store_lib"]
)

arcs_kt_particle(
    name = "parent_particle_lib",
    srcs = ["4_RenderSlots/ParentParticle.kt"],
)

arcs_kt_wasm_binary(
   name = "parent_particle",
   deps = [":parent_particle_lib"]
)

arcs_kt_particle(
    name = "child_particle_lib",
    srcs = ["4_RenderSlots/ChildParticle.kt"],
)

arcs_kt_wasm_binary(
   name = "child_particle",
   deps = [":child_particle_lib"]
)
