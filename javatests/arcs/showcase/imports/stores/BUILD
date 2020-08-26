load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_gen",
)

package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "quality_store",
    srcs = ["quality.arcs"],
#    data = ["quality.json"],  # TODO: Get stores working
)


arcs_kt_jvm_library(
    name = "quality",
    testonly = 1,
    srcs = ["EmitQuality.kt"],
    deps = [":quality_store"],
)
