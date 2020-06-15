load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "devtools",
    srcs = glob([
        "*.kt",
    ]),
    manifest = "AndroidManifest.xml",
    deps = [
        "//third_party/java/nanohttpd",
        "//third_party/java/nanohttpd:nanohttpd-websocket",
    ],
)
