load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_jvm_library(
    name = "mock-database",
    testonly = True,
    srcs = ["MockDatabaseFactory.kt"],
    deps = [
        "//java/arcs/core/storage/database",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/mockito_kotlin",
    ],
)
