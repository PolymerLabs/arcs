load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary", "arcs_kt_schema")

arcs_kt_schema(
    name = "handles_schemas",
    srcs = ["Handles.arcs"],
    package = "arcs.tutorials",
)

arcs_kt_binary(
    name = "GetPerson",
    srcs = ["GetPerson.kt"],
    deps = [":handles_schemas"],
)

arcs_kt_binary(
    name = "DisplayGreeting",
    srcs = ["DisplayGreeting.kt"],
    deps = [":handles_schemas"],
)
