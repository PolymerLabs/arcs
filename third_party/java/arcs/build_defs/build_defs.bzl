"""Arcs BUILD rules."""

load(
    "//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl",
    _kt_js_library = "kt_js_library",
)
load(
    "//third_party/java/arcs/build_defs/internal:kotlin.bzl",
    _arcs_kt_android_library = "arcs_kt_android_library",
    _arcs_kt_android_test_suite = "arcs_kt_android_test_suite",
    _arcs_kt_gen = "arcs_kt_gen",
    _arcs_kt_js_library = "arcs_kt_js_library",
    _arcs_kt_jvm_library = "arcs_kt_jvm_library",
    _arcs_kt_jvm_test_suite = "arcs_kt_jvm_test_suite",
    _arcs_kt_library = "arcs_kt_library",
    _arcs_kt_native_library = "arcs_kt_native_library",
    _arcs_kt_particles = "arcs_kt_particles",
    _arcs_kt_plan = "arcs_kt_plan",
    _arcs_kt_plan_2 = "arcs_kt_plan_2",
    _arcs_kt_schema = "arcs_kt_schema",
)
load(
    "//third_party/java/arcs/build_defs/internal:manifest.bzl",
    _arcs_manifest = "arcs_manifest",
    _arcs_manifest_bundle = "arcs_manifest_bundle",
    _arcs_manifest_proto = "arcs_manifest_proto",
    _arcs_proto_plan = "arcs_proto_plan",
)
load(
    "//third_party/java/arcs/build_defs/internal:schemas.bzl",
    _arcs_cc_schema = "arcs_cc_schema",
)

# Re-export rules from various other files.

# The default Arcs SDK to use.
DEFAULT_ARCS_SDK_DEPS = ["//third_party/java/arcs"]

arcs_cc_schema = _arcs_cc_schema

arcs_kt_android_library = _arcs_kt_android_library

arcs_kt_android_test_suite = _arcs_kt_android_test_suite

def arcs_kt_gen(**kwargs):
    """Wrapper around _arcs_kt_gen that sets the default Arcs SDK

    Args:
      **kwargs: Set of args to forward to _arcs_kt_gen
    """
    kwargs.setdefault("arcs_sdk_deps", DEFAULT_ARCS_SDK_DEPS)
    _arcs_kt_gen(**kwargs)

arcs_kt_jvm_library = _arcs_kt_jvm_library

arcs_kt_jvm_test_suite = _arcs_kt_jvm_test_suite

arcs_kt_library = _arcs_kt_library

arcs_kt_js_library = _arcs_kt_js_library

arcs_kt_native_library = _arcs_kt_native_library

def arcs_kt_particles(**kwargs):
    """Wrapper around _arcs_kt_particles that sets the default Arcs SDK

    Args:
      **kwargs: Set of args to forward to _arcs_kt_particles
    """
    kwargs.setdefault("arcs_sdk_deps", DEFAULT_ARCS_SDK_DEPS)
    _arcs_kt_particles(**kwargs)

def arcs_kt_plan(**kwargs):
    """Wrapper around _arcs_kt_plan that sets the default Arcs SDK

    Args:
      **kwargs: Set of args to forward to _arcs_kt_plan
    """
    kwargs.setdefault("arcs_sdk_deps", DEFAULT_ARCS_SDK_DEPS)
    _arcs_kt_plan(**kwargs)

def arcs_kt_plan_2(**kwargs):
    """Wrapper around _arcs_kt_plan_2 that sets the default Arcs SDK

    Args:
      **kwargs: Set of args to forward to _arcs_kt_plan_2
    """
    kwargs.setdefault("arcs_sdk_deps", DEFAULT_ARCS_SDK_DEPS)
    _arcs_kt_plan_2(**kwargs)

def arcs_kt_schema(**kwargs):
    """Wrapper around _arcs_kt_schema that sets the default Arcs SDK

    Args:
      **kwargs: Set of args to forward to _arcs_kt_schema
    """
    kwargs.setdefault("arcs_sdk_deps", DEFAULT_ARCS_SDK_DEPS)
    _arcs_kt_schema(**kwargs)

arcs_manifest = _arcs_manifest

arcs_manifest_bundle = _arcs_manifest_bundle

arcs_manifest_proto = _arcs_manifest_proto

arcs_proto_plan = _arcs_proto_plan

kt_js_library = _kt_js_library
