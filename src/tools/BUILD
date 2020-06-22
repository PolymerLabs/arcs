load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")
load("@npm_bazel_typescript//:index.bzl", "ts_library")

package(default_visibility = ["//visibility:public"])

ts_library(
    name = "kt-generation-utils",
    srcs = [
        "kotlin-generation-utils.ts",
        "kotlin-codegen-shared.ts",
    ],
    tsconfig = "//:tsconfig",
    deps = ["//src:runtime_lib"]
)

ts_library(
    name = "schema2graph",
    srcs = ["schema2graph.ts"],
    tsconfig = "//:tsconfig",
    deps = ["//src:runtime_lib"]
)

ts_library(
    name = "schema2pkg_lib",
    srcs = [
        "schema2base.ts",
        "schema2wasm.ts",
        "schema2kotlin.ts",
        "schema2cpp.ts",
        "kotlin-entity-generator.ts",
        "kotlin-refinement-generator.ts",
        "kotlin-schema-generator.ts",
    ],
    tsconfig = "//:tsconfig",
    deps = [
        ":schema2graph",
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

ts_library(
    name = "manifest2proto_lib",
    srcs = [
        "manifest2proto.ts",
        "manifest-proto.ts",
        "annotation2proto.ts",
        "policy2proto.ts",
        "runfiles-dir.oss.ts",
    ],
    tsconfig = "//:tsconfig",
    deps = [
        "//src:runtime_lib",
        "@npm//@types/node",
        "@npm//minimist",
        "@npm//protobufjs",
    ],
)

ts_library(
    name = "recipe2plan_lib",
    srcs = [
        "recipe2plan-cli.ts",
        "recipe2plan.ts",
        "plan-generator.ts",
        "allocator-recipe-resolver.ts",
    ],
    tsconfig = "//:tsconfig",
    deps = [
        ":kt-generation-utils",
        ":schema2graph",
        ":manifest2proto_lib",
        "//src:runtime_lib",
        "@npm//@types/node",
        "@npm//minimist",
    ],
)

nodejs_binary(
    name = "recipe2plan",
    data = [":recipe2plan_lib"],
    entry_point = ":recipe2plan-cli.ts",
)
