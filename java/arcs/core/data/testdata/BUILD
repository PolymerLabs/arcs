load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
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
    name = "example_gen",
    srcs = ["WriterReaderExample.arcs"],
)

# TODO(b/153689275): It doesn't resovle currently, can we investigate why?
# arcs_kt_gen(
#     name = "ingest_process_retrieve_gen",
#     srcs = ["IngestProcessRetrieve.arcs"]
# )
