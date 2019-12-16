load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "handles_schemas",
    srcs = ["Handles.arcs"],
    package = "arcs.tutorials",
)

arcs_kt_particles(
    name = "Handles",
    srcs = glob(["*.kt"]),
    deps = [":handles_schemas"],
)
