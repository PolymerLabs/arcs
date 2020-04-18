load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
    "arcs_manifest",
    "arcs_kt_plan",
    "arcs_kt_schema",
)

package(default_visibility = ["//visibility:public"])

licenses(["notice"])

filegroup(
    name = "examples",
    srcs = glob(
        ["*"],
        exclude = ["BUILD"],
    ),
)

arcs_kt_gen(
    name = "import_example_gen",
    srcs = ["ImportExample.arcs"],
    deps = ["Schemas.arcs"],
)

arcs_kt_gen(
    name = "example_gen",
    srcs = ["WriterReaderExample.arcs"],
)

arcs_kt_gen(
    name = "ingest_process_retrieve_gen",
    srcs = ["IngestProcessRetrieve.arcs"],
)

arcs_manifest(
    name = "shared_schemas",
    srcs = ["Schemas.arcs"],
)

arcs_kt_schema(
    name = "multimanifest_schemas",
    srcs = [
        "Ingest.arcs",
        "Analyze.arcs",
        "Request.arcs",
    ],
    deps = ["Schemas.arcs"]
)

#arcs_kt_plan(
#    name = "ingest_plan",
#    srcs = ["Ingest.arcs"],
#    deps = [
#        ":multimanifest_schemas",
#    ],
#)
#
#arcs_kt_plan(
#    name = "analyze_plan",
#    srcs = ["Analyze.arcs"],
#    deps = [
#        ":multimanifest_schemas",
#        ":ingest_plan",
#    ],
#)
#
#arcs_kt_plan(
#    name = "request_plan",
#    srcs = ["Request.arcs"],
#    deps = [
#        ":multimanifest_schemas",
#        ":analyze_plan",
#    ],
#)

arcs_kt_plan(
    name = "etl_plan",
    srcs = [
        "Ingest.arcs",
        "Analyze.arcs",
        "Request.arcs",
    ],
    deps = [
        ":multimanifest_schemas",
        "Schemas.arcs",
    ],
)

#arcs_kt_gen(
#    name = "split_recipe_pathway_gen",
#    srcs = [
#        "Ingest.arcs",
#        "Analyze.arcs",
#        "Request.arcs",
#    ],
#    deps = ["Schemas.arcs"]
#)
