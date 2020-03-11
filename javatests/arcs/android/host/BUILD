load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_schema",
)
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_test_suite(
    name = "host",
    srcs = glob(["*Test.kt"]),
    manifest = "AndroidManifest.xml",
    package = "arcs.android.host",
    deps = [
        ":schemas",
        ":services",
        "//java/arcs/android/host",
        "//java/arcs/android/sdk/host",
        "//java/arcs/android/storage/database",
        "//java/arcs/android/storage/handle",
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//javatests/arcs/core/allocator:allocator-test-util",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/android/androidx_test/runner/monitor",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_reflect",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_schema(
    name = "schemas",
    srcs = [
        "test.arcs",
    ],
    package = "arcs.android.host",
)

kt_android_library(
    name = "services",
    testonly = True,
    srcs = glob(
        [
            "*Service.kt",
            "*Activity.kt",
        ],
    ),
    manifest = "AndroidManifest.xml",
    deps = [
        ":schemas",
        "//java/arcs/android/crdt",
        "//java/arcs/android/host",
        "//java/arcs/android/sdk/host",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage/handle",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/testutil",
        "//java/arcs/sdk",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//java/arcs/sdk/android/storage/service/testutil",
        "//javatests/arcs/core/allocator:allocator-test-util",
        "//javatests/arcs/core/host:particle",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/lifecycle",
        "//third_party/java/robolectric",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
