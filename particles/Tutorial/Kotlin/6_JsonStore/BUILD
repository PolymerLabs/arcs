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
    name = "store_schemas",
    srcs = ["JsonStore.arcs"],
    deps = [":shared_people_schemas"],
)

arcs_kt_particles(
    name = "JsonStore",
    srcs = ["JsonStore.kt"],
    package = "arcs.tutorials",
    platforms = ["wasm"],
    deps = [":store_schemas"],
)
