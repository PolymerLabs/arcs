load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_test_suite(
    name = "storage",
    size = "medium",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.storage",
    deps = [
        ":generators",
        ":invariants",
        "//java/arcs/android/crdt",
        "//java/arcs/android/storage",  # buildcleaner: keep
        "//java/arcs/android/storage:proxy_message_android_proto",
        "//java/arcs/android/storage:store_options_android_proto",
        "//java/arcs/android/storage/database",
        "//java/arcs/android/util/testutil",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data/testutil",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/driver:driver_providers",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/flags/testing",
        "//java/arcs/jvm/util",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_android_library(
    name = "invariants",
    testonly = 1,
    srcs = [
        "StoreInvariants.kt",
    ],
    deps = [
        "//java/arcs/android/storage/database",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/testing",
        "//java/arcs/core/data",
        "//java/arcs/core/storage",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_android_library(
    name = "generators",
    testonly = 1,
    srcs = [
        "FixtureEntitiesOperationsGenerator.kt",
    ],
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil:generator_util",
    ],
)
