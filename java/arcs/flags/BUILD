load(
    "//third_party/java/arcs/build_defs:flag_def.bzl",
    "generate_default_build_flags",
)
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "java_library",
)
load(":flags.bzl", "ARCS_BUILD_FLAGS")

licenses(["notice"])

# Default generated build flags, for use in Arcs libraries. This is marked
# "neverlink", which means it is used when compiling libraries, but is not
# linked into the final binary. Every Android binary must link in its own
# generated BuildFlags class.
#
# Using a Java library instead of a Kotlin library so we can use neverlink.
java_library(
    name = "build_flags",
    srcs = [":default_build_flags_src"],
    neverlink = 1,
    visibility = ["//java/arcs:arcs-internal"],
)

generate_default_build_flags(
    name = "default_build_flags_src",
    flags = ARCS_BUILD_FLAGS,
)
