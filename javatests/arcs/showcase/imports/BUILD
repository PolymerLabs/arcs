load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_test_suite(
    name = "imports",
    srcs = ["ImportsTest.kt"],
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.showcase.imports",
    deps = [
        "//java/arcs/core/host",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util/testutil",
        "//javatests/arcs/showcase",
        "//javatests/arcs/showcase/imports/particles:port",
        "//javatests/arcs/showcase/imports/recipes:gatherImports_recipe",
        "//javatests/arcs/showcase/imports/schemas:common_schemas",
        "//javatests/arcs/showcase/imports/schemas:shipping_schemas",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
