load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")
load("@npm_bazel_typescript//:index.bzl", "ts_library")

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
    srcs = [":schema2pkg_srcs"],
    tsconfig = "//:tsconfig",
    deps = [
        ":kt-generation-utils",
        "//src:runtime_lib",
        "@npm//@types/node",
        "@npm//minimist",
    ],
)

nodejs_binary(
    name = "schema2pkg",
    data = [":schema2pkg_lib"],
    entry_point = ":schema2wasm.ts",
)
