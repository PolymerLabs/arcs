load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "proto",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/data/proto",
        "//java/arcs/core/data/proto:policy_java_proto_lite",
        "//java/arcs/core/policy",
    ],
)
