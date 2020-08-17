load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
)

package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "imports_recipe",
    srcs = ["imports.arcs"],
    deps = [
        "//javatests/arcs/showcase/imports/particles:port_particles",
    ],
)

arcs_kt_gen(
    name = "inventory_recipe",
    srcs = ["inventory.arcs"],
    deps = [
        ":imports_recipe",
        "//javatests/arcs/showcase/imports/particles:inventory_particles",
    ],
)

arcs_kt_gen(
    name = "store_recipe",
    srcs = ["store.arcs"],
    deps = [
        ":inventory_recipe",
        "//javatests/arcs/showcase/imports/particles:store_particles",
    ],
)
