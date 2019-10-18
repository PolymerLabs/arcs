load("//build_defs:build_defs.bzl", "arcs_manifest", "arcs_kt_particle", "arcs_kt_wasm_binary")

arcs_kt_particle(
    name = "parent_particle_lib",
    srcs = ["ParentParticle.kt"],
)

arcs_kt_wasm_binary(
   name = "ParentParticle",
   deps = [":parent_particle_lib"]
)

arcs_kt_particle(
    name = "child_particle_lib",
    srcs = ["ChildParticle.kt"],
)

arcs_kt_wasm_binary(
   name = "ChildParticle",
   deps = [":child_particle_lib"]
)
