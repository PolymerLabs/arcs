licenses(["notice"])

package(default_visibility = ["//java/arcs:__subpackages__"])

load("@io_bazel_rules_closure//closure:defs.bzl",
     "closure_js_library",
     "closure_repositories",
     "web_library")
load("@com_google_j2cl//build_defs:rules.bzl", "j2cl_application", "j2cl_library")

j2cl_library(
    name = "demo-j2cl",
    srcs = glob([
        "*.java",
    ]),
    deps = [
        "//java/arcs:dagger-j2cl",
        "//java/arcs:dagger_runtime-j2cl",
        "//java/arcs:javax_inject-j2cl",
        "//java/arcs/api:api-j2cl",
        "//java/arcs/crdt:crdt-j2cl",
        "//java/arcs/web/impl:impl",
        "//java/arcs/demo/particles:particles-j2cl",
        "//java/arcs/demo/services:services-j2cl",
        "//java/arcs/demo/ui:ui-j2cl",
        "@com_google_elemental2//:elemental2-core-j2cl",
        "@com_google_elemental2//:elemental2-promise-j2cl",
        "@com_google_elemental2//:elemental2-dom-j2cl",
        "@com_google_j2cl//:jsinterop-annotations-j2cl",
        "@com_google_jsinterop_base//:jsinterop-base-j2cl",
    ],
)

closure_js_library(
    name = "harness_js",
    srcs = ["harness_entry.js"],
    externs = ["externs.js"],
    suppress = [
        "checkTypes",
        "reportUnknownTypes",
    ],
    deps = [
        ":demo-j2cl",
    ],
)

j2cl_application(
    name = "demo",
    entry_points = ["arcs.web.demo"],
    extra_dev_resources = [
      "//java/arcs:particles",
      "//java/arcs:pipes-shell-dist",
    ],
    deps = [":harness_js"],
)
