load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

licenses(["notice"])

arcs_kt_gen(
    name = "codegen",
    srcs = ["actor.arcs"],
)

arcs_kt_android_test_suite(
    name = "actor",
    size = "medium",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.integration.actor",
    deps = [
        ":codegen",
        "//java/arcs/core/allocator",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/flags/testing",
        "//javatests/arcs/android/integration",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric:annotations",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
