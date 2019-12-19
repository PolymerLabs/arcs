load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)
load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "stringEncoder",
    package = "arcs.sdk.kotlin",
    deps = [
        "//java/arcs/sdk/kotlin:arcs",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
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
        exclude = ["wasm/TestBase.kt", "wasm/Test.kt"],
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
    srcs = ["wasm/TestBase.kt", "wasm/Test.kt"],
    jvm = False,
    deps = [":schemas"],
)
