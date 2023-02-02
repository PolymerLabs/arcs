load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_library(
    name = "proto",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/proto",
        "//java/arcs/core/data/proto:manifest_java_proto_lite",
        "//java/arcs/core/data/proto:policy_java_proto_lite",
        "//java/arcs/core/policy",
    ],
)

# Equivalent to the above, but uses java_proto instead of java_lite_proto deps.
arcs_kt_jvm_library(
    name = "java_proto",
    srcs = glob(["*.kt"]),
    add_android_constraints = False,
    deps = [
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/proto:manifest_java_proto",
        "//java/arcs/core/data/proto:policy_java_proto",
        "//java/arcs/core/data/proto:proto_for_test",
        "//java/arcs/core/policy",
    ],
)
