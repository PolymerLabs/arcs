load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

licenses(["notice"])

arcs_kt_gen(
    name = "codegen",
    srcs = ["queries.arcs"],
)

arcs_kt_android_library(
    name = "particles",
    testonly = 1,
    srcs = [
        "ProductClassifier.kt",
        "ProductDatabase.kt",
    ],
    deps = [
        ":codegen",
        "//java/arcs/android/storage/database",
        "//java/arcs/core/entity",
        "//java/arcs/jvm/host",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//javatests/arcs/android/integration",
    ],
)

arcs_kt_android_test_suite(
    name = "tests",
    size = "small",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.showcase.queries",
    deps = [
        ":codegen",
        ":particles",
        "//java/arcs/core/host",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//javatests/arcs/android/integration",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
