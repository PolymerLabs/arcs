load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_android_test_suite(
    name = "entity",
    size = "medium",
    srcs = glob(["*.kt"]),
    manifest = "AndroidManifest.xml",
    package = "arcs.android.entity",
    deps = [
        ":test",
        "//java/arcs/android/storage/database",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_schema(
    name = "test",
    srcs = ["test.arcs"],
)
