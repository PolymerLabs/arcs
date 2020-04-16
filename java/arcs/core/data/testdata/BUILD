load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
    "arcs_manifest",
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

arcs_kt_gen(
    name = "split_recipe_pathway_gen",
    srcs = [
        "Analyze.arcs",
        "Ingest.arcs",
        "Request.arcs",
    ],
    deps = ["Schemas.arcs"]
)
