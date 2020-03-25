package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "define_kt_toolchain")

define_kt_toolchain(
    name = "kotlin_toolchain",
    api_version = "1.3",
    jvm_target = "1.8",
    language_version = "1.3",
)

exports_files([
    "kotlin_serviceloader_registry_template.tmpl",
    "kotlin_wasm_annotations_template.tmpl",
])
