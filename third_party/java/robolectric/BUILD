load("@rules_java//java:defs.bzl", "java_library")

package(default_visibility = ["//visibility:public"])

licenses(["notice"])

java_library(
    name = "robolectric",
    exports = [
        "@maven//:org_robolectric_robolectric",
    ],
)

java_library(
    name = "annotations",
    exports = [
        "@maven//:org_robolectric_annotations",
    ],
)

java_library(
    name = "shadows",
    exports = [
        "@maven//:org_robolectric_shadowapi",
        "@maven//:org_robolectric_shadows_framework",
    ],
)
