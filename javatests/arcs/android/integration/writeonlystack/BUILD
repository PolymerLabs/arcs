load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

licenses(["notice"])

arcs_kt_gen(
    name = "manifest_generation",
    srcs = ["manifest.arcs"],
    deps = [
        "//java/arcs/core/entity/testutil:fixture_arcs_gen",  # unuseddeps: keep
    ],
)

arcs_kt_android_test_suite(
    name = "writeonlystack-tests",
    size = "medium",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.integration.writeonlystack",
    deps = [
        ":manifest_generation",
        "//java/arcs/android/util/testutil",
        "//java/arcs/core/entity",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/host",
        "//java/arcs/core/storage:storage-kt",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/flags:build_flags",
        "//java/arcs/sdk/android/storage/service",
        "//javatests/arcs/android/integration",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
