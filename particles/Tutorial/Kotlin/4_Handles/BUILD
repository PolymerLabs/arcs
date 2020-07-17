load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_particles",
    "arcs_kt_schema",
    "arcs_manifest",
)

licenses(["notice"])

arcs_manifest(
    name = "shared_people_schemas",
    srcs = ["PeopleSchemas.arcs"],
)

arcs_kt_schema(
    name = "handles_schemas",
    srcs = ["Handles.arcs"],
    platforms = ["wasm"],
    deps = [":shared_people_schemas"],
)

arcs_kt_particles(
    name = "Handles",
    srcs = glob(["*.kt"]),
    package = "arcs.tutorials",
    platforms = ["wasm"],
    deps = [":handles_schemas"],
)
