load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

FLAKY_SRCS = [
    "DifferentAndroidHandleManagerDifferentStoresTest.kt",
]

NONFLAKY_SRCS = glob(
    ["*.kt"],
    exclude = FLAKY_SRCS,
)

arcs_kt_android_test_suite(
    name = "entity",
    size = "medium",
    srcs = NONFLAKY_SRCS,
    manifest = "AndroidManifest.xml",
    package = "arcs.android.entity",
    deps = [
        "//java/arcs/android/storage/database",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//javatests/arcs/core/entity:lib",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/androidx/lifecycle",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_android_test_suite(
    name = "entity-flaky",
    size = "medium",
    srcs = FLAKY_SRCS,
    # TODO(b/157513765): Deflake this test suite.
    flaky = True,
    manifest = "AndroidManifest.xml",
    package = "arcs.android.entity",
    deps = [
        "//java/arcs/android/storage/database",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//javatests/arcs/core/entity:lib",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/androidx/lifecycle",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
