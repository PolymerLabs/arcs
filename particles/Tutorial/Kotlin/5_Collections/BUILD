load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "collections_schemas",
    srcs = ["Collections.arcs"],
)

arcs_kt_particles(
    name = "Collections",
    srcs = ["Collections.kt"],
    package = "arcs.tutorials",
    deps = [":collections_schemas"],
)
