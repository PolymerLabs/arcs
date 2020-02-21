load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "schemas",
    srcs = ["BasicTemplates.arcs"],
    package = "arcs.tutorials",
)

arcs_kt_particles(
    name = "BasicTemplate",
    srcs = ["BasicTemplate.kt"],
    package = "arcs.tutorials",
    platforms = ["wasm"],
    deps = [":schemas"],
)
