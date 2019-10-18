load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_js_library", "kt_jvm_library")

def kt_arcs_library(
        name = None,
        srcs = [],
        deps = []):
    """Simultaneously defines JVM and JS kotlin libraries.
    name: String; Name of the library
    srcs: List; List of sources
    deps: List; List of dependencies
    """
    kt_jvm_library(
        name = name,
        srcs = srcs,
        deps = deps,
    )

    kt_js_library(
        name = "%s-js" % name,
        srcs = srcs,
        deps = [_to_js_dep(dep) for dep in deps],
    )

def _to_js_dep(dep):
    last_part = dep.split("/")[-1]

    index_of_colon = dep.find(":")
    if (index_of_colon == -1):
        return dep + (":%s-js" % last_part)
    else:
        return dep + "-js"
