load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "handles",
    testonly = True,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/entity",
        "//java/arcs/core/storage",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
