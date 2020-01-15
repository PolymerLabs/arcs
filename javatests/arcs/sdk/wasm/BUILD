load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "schemas",
    srcs = ["manifest.arcs"],
    package = "arcs.sdk.wasm",
)

arcs_kt_particles(
    name = "test-module",
    srcs = glob(
        ["*.kt"],
        exclude = [
            "TestBase.kt",
            "Test.kt",
        ],
    ),
    jvm = False,
    package = "arcs.sdk.wasm",
    visibility = ["//visibility:public"],
    deps = [
        ":TestBase",
        ":schemas",
    ],
)

arcs_kt_library(
    name = "TestBase",
    srcs = [
        "Test.kt",
        "TestBase.kt",
    ],
    jvm = False,
    deps = [
        ":schemas",
        "//java/arcs/sdk:arcs",
    ],
)
