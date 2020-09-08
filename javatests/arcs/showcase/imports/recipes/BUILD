load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "gather_imports_recipe",
    srcs = ["gather_imports.arcs"],
    deps = [
        "//javatests/arcs/showcase/imports/particles:port_particles",
    ],
)
