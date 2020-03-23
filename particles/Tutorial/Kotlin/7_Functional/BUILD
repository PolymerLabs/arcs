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
    name = "functional_schemas",
    srcs = ["Functional.arcs"],
    deps = [":shared_people_schemas"],
    platforms = ["wasm"],
)

arcs_kt_particles(
    name = "Functional",
    srcs = glob(["*.kt"]),
    package = "arcs.tutorials",
    platforms = ["wasm"],
    deps = [":functional_schemas"],
)
