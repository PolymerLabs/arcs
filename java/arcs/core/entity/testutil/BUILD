load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library", "arcs_kt_schema")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "testutil",
    testonly = True,
    srcs = glob(["*.kt"]),
    exports = [":fixture_arcs_gen"],
    deps = [
        ":fixture_arcs_gen",
        "//java/arcs/core/common",
        "//java/arcs/core/data:annotations",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/entity",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util:utils-platform-dependencies",
    ],
)

arcs_kt_schema(
    name = "fixture_arcs_gen",
    srcs = ["fixture.arcs"],
)
