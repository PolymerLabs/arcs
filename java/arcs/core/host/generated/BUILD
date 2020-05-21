load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_plan", "arcs_kt_schema")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_schema(
    name = "schemas",
    srcs = [
        "ArcHostContext.arcs",
    ],
)

arcs_kt_plan(
    name = "plan",
    srcs = [
        "ArcHostContext.arcs",
    ],
    deps = [
        ":schemas",
    ],
)
