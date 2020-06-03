load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_manifest_proto")

package(default_visibility = ["//visibility:public"])

licenses(["notice"])

INVALID_MANIFESTS = glob(["fail_*.arcs"])

VALID_MANIFESTS = glob(["ok_*.arcs"])

ALL_MANIFESTS = VALID_MANIFESTS + INVALID_MANIFESTS

filegroup(
    name = "example_manifest_protos",
    srcs = [":%s" % m.replace(".arcs", "") for m in ALL_MANIFESTS] +
           [":%s" % m for m in ALL_MANIFESTS],
)

[arcs_manifest_proto(
    name = manifest.replace(".arcs", ""),
    src = "%s" % manifest,
) for manifest in ALL_MANIFESTS]
