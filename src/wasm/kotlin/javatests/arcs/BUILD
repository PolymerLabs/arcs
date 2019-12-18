load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "schemas",
    srcs = ["//src/wasm/tests:manifest.arcs"],
    package = "sdk.kotlin.javatests.arcs",
)

arcs_kt_particles(
    name = "test-module",
    srcs = glob(
        ["*.kt"],
        exclude = ["TestBase.kt"],
    ),
    jvm = False,
    package = "sdk.kotlin.javatests.arcs",
    visibility = ["//visibility:public"],
    deps = [
        ":TestBase",
        ":schemas",
    ],
)

arcs_kt_library(
    name = "TestBase",
    srcs = ["TestBase.kt"],
    jvm = False,
    deps = [":schemas"],
)
