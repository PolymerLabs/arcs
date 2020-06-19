package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "define_kt_toolchain")
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")


define_kt_toolchain(
    name = "kotlin_toolchain",
    api_version = "1.3",
    jvm_target = "1.8",
    language_version = "1.3",
)

exports_files([
    "kotlin_wasm_annotations_template.tmpl",
])

nodejs_binary(
   name = "ts_pegjs_cli",
   entry_point = "@npm//:node_modules/ts-pegjs/src/cli.js",
   data = ["@npm//ts-pegjs"]
)
