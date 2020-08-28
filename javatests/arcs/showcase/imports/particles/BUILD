load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
    "arcs_kt_jvm_library",
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

arcs_kt_jvm_library(
    name = "inventory",
    testonly = 1,
    srcs = [
        "LabelInventory.kt",
        "ProduceInventory.kt",
    ],
    deps = [
        ":inventory_particles",
    ],
)

arcs_kt_jvm_library(
    name = "port",
    testonly = 1,
    srcs = [
        "AcceptImports.kt",
        "IngestDock.kt",
    ],
    deps = [
        ":port_particles",
    ],
)

arcs_kt_jvm_library(
    name = "store",
    testonly = 1,
    srcs = [
        "IngestOrder.kt",
        "PackageEgress.kt",
        "PlaceOrder.kt",
    ],
    deps = [
        ":store_particles",
    ],
)
