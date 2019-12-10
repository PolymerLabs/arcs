load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary", "arcs_kt_schema")

arcs_kt_schema(
    name = "collections_schemas",
    srcs = ["Collections.arcs"],
)

arcs_kt_binary(
    name = "Collections",
    srcs = ["Collections.kt"],
    deps = [":collections_schemas"],
)
