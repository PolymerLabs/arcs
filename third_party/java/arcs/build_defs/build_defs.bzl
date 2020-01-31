"""Arcs BUILD rules."""

load(
    "//third_party/java/arcs/build_defs/internal:kotlin.bzl",
    _arcs_kt_android_test_suite = "arcs_kt_android_test_suite",
    _arcs_kt_jvm_library = "arcs_kt_jvm_library",
    _arcs_kt_jvm_test_suite = "arcs_kt_jvm_test_suite",
    _arcs_kt_library = "arcs_kt_library",
    _arcs_kt_native_library = "arcs_kt_native_library",
    _arcs_kt_particles = "arcs_kt_particles",
    _kt_jvm_and_js_library = "kt_jvm_and_js_library",
)
load(
    "//third_party/java/arcs/build_defs/internal:manifest.bzl",
    _arcs_manifest = "arcs_manifest",
    _arcs_manifest_bundle = "arcs_manifest_bundle",
    _arcs_serialize_manifst = "arcs_serialize_manifest",
)
load(
    "//third_party/java/arcs/build_defs/internal:schemas.bzl",
    _arcs_cc_schema = "arcs_cc_schema",
    _arcs_kt_schema = "arcs_kt_schema",
)
load(":sigh.bzl", "sigh_command")

# Re-export rules from various other files.

arcs_cc_schema = _arcs_cc_schema

arcs_kt_android_test_suite = _arcs_kt_android_test_suite

arcs_kt_jvm_test_suite = _arcs_kt_jvm_test_suite

arcs_kt_schema = _arcs_kt_schema

arcs_kt_library = _arcs_kt_library

arcs_kt_native_library = _arcs_kt_native_library

arcs_kt_particles = _arcs_kt_particles

arcs_manifest = _arcs_manifest

arcs_manifest_bundle = _arcs_manifest_bundle

arcs_serialize_manifest = _arcs_serialize_manifst

kt_jvm_and_js_library = _kt_jvm_and_js_library

arcs_kt_jvm_library = _arcs_kt_jvm_library

def arcs_ts_test(name, src, deps):
    """Runs a TypeScript test file using `sigh test`."""
    sigh_command(
        name = name,
        srcs = [src],
        execute = False,
        sigh_cmd = "test --bazel --file {SRC}",
        deps = deps,
    )
