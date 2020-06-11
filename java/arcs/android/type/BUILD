load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "type",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/type",
    ],
)
