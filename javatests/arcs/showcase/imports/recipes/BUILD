load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
)

package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "gatherImports_recipe",
    srcs = ["gatherImports.arcs"],
    deps = [
        "//javatests/arcs/showcase/imports/particles:port_particles",
    ],
)
