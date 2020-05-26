load("@npm_bazel_typescript//:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "schema2pkg_srcs",
    srcs = glob(["schema2*.ts"]),
)


ts_library(
    name = "kt-generation-utils",
    srcs = ["kotlin-generation-utils.ts"],
    tsconfig = "//:tsconfig",
)

ts_library(
    name = "schema2pkg_lib",
    srcs = [":schema2pkg_srcs", "kotlin-generation-utils.ts"],
    deps = ["//src:runtime_lib"],
    tsconfig = "//:tsconfig",
)

nodejs_binary(
    name = "schema2pkg",
    data = [":schema2pkg_lib"],
    entry_point = ":schema2wasm.ts"
)

