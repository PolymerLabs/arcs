load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_java_library",
    "arcs_kt_library",
)
load("//third_party/java/arcs/flags:flags.bzl", "ARCS_BUILD_FLAGS")
load(
    "//third_party/java/arcs/flags:generate_build_flags.bzl",
    "generate_build_flags",
)

licenses(["notice"])

arcs_kt_library(
    name = "flags",
    srcs = glob(["*.kt"]),
    visibility = ["//java/arcs:arcs-internal"],
    exports = [":build_flags"],
)

# Default generated build flags, for use in Arcs libraries. This is marked
# "neverlink", which means it is used when compiling libraries, but is not
# linked into the final binary. Every Android binary must link in its own
# generated BuildFlags class.
#
# Using a Java library instead of a Kotlin library so we can use neverlink.
arcs_java_library(
    name = "build_flags",
    srcs = [":build_flags_src"],
    constraints = ["android"],
    neverlink = True,
    visibility = ["//java/arcs:arcs-internal"],
)

# Generates a BuildFlags library that can be compiled and linked in unit tests.
arcs_java_library(
    name = "unit_test_build_flags",
    testonly = True,
    srcs = [":build_flags_src"],
    constraints = ["android"],
    visibility = ["//java/arcs:arcs-internal"],
)

generate_build_flags(
    name = "build_flags_src",
    dev_mode = True,
    flags = ARCS_BUILD_FLAGS,
)
