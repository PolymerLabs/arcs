load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "schemas",
    srcs = ["RenderSlots.arcs"],
    platforms = ["wasm"],
)

arcs_kt_particles(
    name = "RenderSlots",
    srcs = glob(["*.kt"]),
    package = "arcs.tutorials",
    platforms = ["wasm"],
    deps = [":schemas"],
)
