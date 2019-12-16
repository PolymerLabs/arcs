load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "store_schemas",
    srcs = ["JsonStore.arcs"],
    package = "arcs.tutorials",
)

arcs_kt_particles(
    name = "JsonStore",
    srcs = ["JsonStore.kt"],
    deps = [":store_schemas"],
)
