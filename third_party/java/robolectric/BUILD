package(default_visibility = ["//visibility:public"])

licenses(["notice"])

alias(
    name = "robolectric",
    actual = "@maven//:org_robolectric_robolectric",
)

java_library(
    name = "shadows",
    exports = [
        "@maven//:org_robolectric_shadowapi",
        "@maven//:org_robolectric_shadows_framework",
    ],
)
