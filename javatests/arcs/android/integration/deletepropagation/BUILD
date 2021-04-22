load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_gen",
)

licenses(["notice"])

arcs_kt_gen(
    name = "codegen",
    srcs = ["deletepropagation.arcs"],
)

arcs_kt_android_test_suite(
    name = "deletepropagation",
    size = "medium",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.integration.deletepropagation",
    shard_count = 2,
    deps = [
        ":codegen",
        "//java/arcs/android/util/testutil",
        "//java/arcs/core/allocator",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//javatests/arcs/android/integration",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric:annotations",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
