load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

arcs_kt_schema(
    name = "schemas",
    srcs = ["//src/wasm/tests:manifest.arcs"],
    package = "arcs.sdk.kotlin.wasm",
)

arcs_kt_particles(
    name = "test-module",
    srcs = glob(
        ["wasm/*.kt"],
        exclude = [
            "wasm/TestBase.kt",
            "wasm/Test.kt",
        ],
    ),
    jvm = False,
    package = "arcs.sdk.kotlin.wasm",
    visibility = ["//visibility:public"],
    deps = [
        ":TestBase",
        ":schemas",
    ],
)

arcs_kt_library(
    name = "TestBase",
    srcs = [
        "wasm/Test.kt",
        "wasm/TestBase.kt",
    ],
    jvm = False,
    deps = [":schemas"],
)
