load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
)

package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "inventory_particles",
    srcs = ["inventory.arcs"],
    deps = [
        "//javatests/arcs/showcase/imports/schemas:common_schemas",
        "//javatests/arcs/showcase/imports/schemas:shipping_schemas",
    ],
)

arcs_kt_gen(
    name = "port_particles",
    srcs = ["port.arcs"],
    deps = [
        "//javatests/arcs/showcase/imports/schemas:shipping_schemas",
    ],
)

arcs_kt_gen(
    name = "store_particles",
    srcs = ["store.arcs"],
    deps = [
        "//javatests/arcs/showcase/imports/schemas:common_schemas",
    ],
)
