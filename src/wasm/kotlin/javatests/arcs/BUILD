load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
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
    visibility = ["//visibility:public"],
    deps = [
        ":TestBase-lib",
        ":schemas",
    ],
)

arcs_kt_particles(
    name = "TestBase",
    srcs = ["TestBase.kt"],
    deps = [":schemas"],
)
