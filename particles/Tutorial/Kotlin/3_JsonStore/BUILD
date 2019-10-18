load("//build_defs:build_defs.bzl", "arcs_kt_schema", "arcs_kt_particle")

arcs_kt_schema(
    name = "store_schemas",
    src = "JsonStore.arcs",
)

arcs_kt_particle(
    name = "JsonStore",
    srcs = ["JsonStore.kt"],
    deps = [":store_schemas"]
)
