load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
    "arcs_kt_jvm_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_gen(
    name = "port_particles",
    srcs = ["port.arcs"],
    deps = [
        "//javatests/arcs/showcase/imports/schemas:shipping_schemas",
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
        "//java/arcs/core/entity",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
