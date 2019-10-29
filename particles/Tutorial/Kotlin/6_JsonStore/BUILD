load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary", "arcs_kt_schema")

arcs_kt_schema(
    name = "store_schemas",
    srcs = ["JsonStore.arcs"],
    package = "arcs.tutorials",
)

arcs_kt_binary(
    name = "JsonStore",
    srcs = ["JsonStore.kt"],
    deps = [":store_schemas"],
)
