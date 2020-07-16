load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_js_library",
    "arcs_kt_jvm_library",
    "arcs_kt_library",
    "arcs_kt_native_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

COMMON_PLATFORM_SRCS = [
    "ArcsStrictMode.kt",
    "ThreadLocal.kt",
]

JS_PLATFORM_SRCS = glob(["platform/js/*.kt"])

JVM_PLATFORM_SRCS = glob(["platform/jvm/*.kt"])

NATIVE_PLATFORM_SRCS = glob(["platform/native/*.kt"])

PLATFORM_SRCS = COMMON_PLATFORM_SRCS + JS_PLATFORM_SRCS + JVM_PLATFORM_SRCS + NATIVE_PLATFORM_SRCS

arcs_kt_library(
    name = "util",
    srcs = glob(
        ["*.kt"],
        exclude = PLATFORM_SRCS,
    ),
    deps = [
        ":utils-platform-dependencies",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_library(
    name = "utils-platform-dependencies",
    srcs = COMMON_PLATFORM_SRCS,
    deps = [":utils-platform-dependencies-internal"],
)

arcs_kt_jvm_library(
    name = "utils-platform-dependencies-internal",
    srcs = JVM_PLATFORM_SRCS,
    visibility = ["//visibility:private"],
)

arcs_kt_js_library(
    name = "utils-platform-dependencies-internal-js",
    srcs = JS_PLATFORM_SRCS,
    visibility = ["//visibility:private"],
)

arcs_kt_native_library(
    name = "utils-platform-dependencies-internal-wasm",
    srcs = NATIVE_PLATFORM_SRCS,
    visibility = ["//visibility:private"],
)
