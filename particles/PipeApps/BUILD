load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_manifest",
    "arcs_manifest_parse_test",
)

package(default_visibility = ["//visibility:public"])

arcs_manifest(
    name = "IncomingEntity",
    srcs = ["schemas/IncomingEntity.arcs"],
)

arcs_manifest(
    name = "Person",
    srcs = ["schemas/Person.arcs"],
)

arcs_manifest(
    name = "AndroidAutofill",
    srcs = ["AndroidAutofill.arcs"],
    deps = [
        ":IncomingEntity",
        ":Person",
        ":source/DummyAutofillResponder.js",
    ],
)

arcs_manifest_parse_test(
    name = "Autofill_test",
    srcs = ["AndroidAutofill.arcs"],
    deps = [
        ":IncomingEntity",
        ":Person",
        ":source/DummyAutofillResponder.js",
    ],
)

arcs_manifest(
    name = "RenderNotification",
    srcs = ["RenderNotification.arcs"],
    deps = [":source/RenderNotification.js"],
)
