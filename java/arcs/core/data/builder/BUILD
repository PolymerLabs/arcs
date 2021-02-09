load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "dsl_annotation",
    srcs = ["DataDsl.kt"],
)

arcs_kt_library(
    name = "annotation_builder",
    srcs = ["AnnotationBuilder.kt"],
    deps = [
        ":dsl_annotation",
        "//java/arcs/core/data:annotations",
    ],
)

arcs_kt_library(
    name = "builder",
    srcs = glob(
        ["*.kt"],
        exclude = ["DataDsl.kt"],
    ),
    exports = [
        ":annotation_builder",
    ],
    deps = [
        ":annotation_builder",
        ":dsl_annotation",
        "//java/arcs/core/data",
        "//java/arcs/core/data:annotations",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/expression",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/type",
    ],
)
