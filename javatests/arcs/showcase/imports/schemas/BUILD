load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
)
package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "common_schemas",
    srcs = ["common.arcs"],
)

arcs_kt_gen(
    name = "shipping_schemas",
    srcs = ["shipping.arcs"],
    deps = [":common_schemas"],
)
