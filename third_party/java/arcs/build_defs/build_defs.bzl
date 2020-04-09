"""Arcs BUILD rules."""

load(
    "//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl",
    _kt_js_library = "kt_js_library",
)
load(
    "//third_party/java/arcs/build_defs/internal:kotlin.bzl",
    _arcs_kt_android_library = "arcs_kt_android_library",
    _arcs_kt_android_test_suite = "arcs_kt_android_test_suite",
    _arcs_kt_jvm_library = "arcs_kt_jvm_library",
    _arcs_kt_jvm_test_suite = "arcs_kt_jvm_test_suite",
    _arcs_kt_library = "arcs_kt_library",
    _arcs_kt_native_library = "arcs_kt_native_library",
    _arcs_kt_particles = "arcs_kt_particles",
    _arcs_kt_plan = "arcs_kt_plan",
)
load(
    "//third_party/java/arcs/build_defs/internal:manifest.bzl",
    _arcs_manifest = "arcs_manifest",
    _arcs_manifest_bundle = "arcs_manifest_bundle",
    _arcs_manifest_json = "arcs_manifest_json",
    _arcs_manifest_proto = "arcs_manifest_proto",
)
load(
    "//third_party/java/arcs/build_defs/internal:schemas.bzl",
    _arcs_cc_schema = "arcs_cc_schema",
    _arcs_kt_gen = "arcs_kt_gen",
    _arcs_kt_schema = "arcs_kt_schema",
)
load(
    "//third_party/java/arcs/build_defs/internal:tools.oss.bzl",
    _arcs_manifest_parse_test = "arcs_manifest_parse_test",
)
load(":sigh.bzl", "sigh_command")

# Re-export rules from various other files.

arcs_cc_schema = _arcs_cc_schema

arcs_kt_android_library = _arcs_kt_android_library

arcs_kt_android_test_suite = _arcs_kt_android_test_suite

arcs_kt_gen = _arcs_kt_gen

arcs_kt_jvm_library = _arcs_kt_jvm_library

arcs_kt_jvm_test_suite = _arcs_kt_jvm_test_suite

arcs_kt_library = _arcs_kt_library

arcs_kt_native_library = _arcs_kt_native_library

arcs_kt_particles = _arcs_kt_particles

arcs_kt_plan = _arcs_kt_plan

arcs_kt_schema = _arcs_kt_schema

arcs_manifest = _arcs_manifest

arcs_manifest_bundle = _arcs_manifest_bundle

arcs_manifest_json = _arcs_manifest_json

arcs_manifest_parse_test = _arcs_manifest_parse_test

arcs_manifest_proto = _arcs_manifest_proto

kt_js_library = _kt_js_library

def arcs_ts_test(name, src, deps, flaky = False):
    """Runs a TypeScript test file using `sigh test`."""
    sigh_command(
        name = name,
        srcs = [src],
        execute = False,
        sigh_cmd = "test --bazel --file {SRC}",
        flaky = flaky,
        deps = deps,
    )
