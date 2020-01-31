load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_library",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

WASM_UNIT_TEST_SRCS = [
    "StringDecoderTest.kt",
    "StringEncoderTest.kt",
]

PARTICLE_TEST_BASE_SRCS = [
    "Test.kt",
    "TestBase.kt",
]

PARTICLE_TEST_SRCS = glob(
    ["*.kt"],
    exclude = PARTICLE_TEST_BASE_SRCS + WASM_UNIT_TEST_SRCS,
)

arcs_kt_schema(
    name = "schemas",
    srcs = ["manifest.arcs"],
    package = "arcs.sdk.wasm",
)

arcs_kt_particles(
    name = "test-module",
    srcs = PARTICLE_TEST_SRCS,
    package = "arcs.sdk.wasm",
    platforms = ["wasm"],
    visibility = ["//visibility:public"],
    deps = [
        ":TestBase",
        ":schemas",
    ],
)

arcs_kt_library(
    name = "TestBase",
    srcs = PARTICLE_TEST_BASE_SRCS,
    platforms = ["wasm"],
    deps = [
        ":schemas",
        "//java/arcs/sdk",
    ],
)

arcs_kt_jvm_test_suite(
    name = "WasmUnitTests",
    srcs = WASM_UNIT_TEST_SRCS,
    package = "arcs.sdk.wasm",
    deps = [
        "//java/arcs/sdk:sdk-wasm-testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
