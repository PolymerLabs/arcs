load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

licenses(["notice"])

arcs_kt_gen(
    name = "var_generation",
    srcs = ["variable.arcs"],
)

arcs_kt_android_library(
    name = "shop_particles",
    testonly = 1,
    srcs = [
        "Consumer.kt",
        "OrderIngestion.kt",
        "SkuRedactor.kt",
    ],
    deps = [
        ":var_generation",
        "//java/arcs/core/entity",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_android_test_suite(
    name = "variable-tests",
    size = "medium",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.showcase.typevariables",
    deps = [
        ":shop_particles",
        ":var_generation",
        "//java/arcs/core/host",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util/testutil",
        "//javatests/arcs/showcase",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
