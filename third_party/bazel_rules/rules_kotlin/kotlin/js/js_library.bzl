"""Kotlin JS Rules"""

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", _kt_js_import = "kt_js_import", _kt_js_library = "kt_js_library")
load("@io_bazel_rules_kotlin//kotlin/internal:defs.bzl", "KtJsInfo")
load("//third_party/bazel_rules/rules_kotlin/kotlin/js:impl.bzl", "kt_js_import_impl")

kt_js_library = _kt_js_library

kt_js_import = _kt_js_import

kt_js_import_fixed = rule(
    attrs = {
        "jars": attr.label_list(
            allow_files = [".jar"],
            mandatory = True,
        ),
        "srcjar": attr.label(
            mandatory = False,
            allow_single_file = ["-sources.jar"],
        ),
        "runtime_deps": attr.label_list(
            default = [],
            allow_files = [".jar"],
            mandatory = False,
        ),
        "module_name": attr.string(
            doc = "internal attribute",
            mandatory = False,
        ),
        "module_root": attr.string(
            doc = "internal attriubte",
            mandatory = False,
        ),
        "_importer": attr.label(
            default = "//third_party/bazel_rules/rules_kotlin/kotlin/js:importer",
            allow_files = True,
            executable = True,
            cfg = "host",
        ),
    },
    outputs = dict(
        js = "%{module_name}.js",
        js_map = "%{module_name}.js.map",
    ),
    implementation = kt_js_import_impl,
    provides = [KtJsInfo],
)
