load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_test_suite(
    name = "database",
    size = "medium",
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.storage.database",
    deps = [
        "//java/arcs/android/common",  # buildcleaner: keep
        "//java/arcs/android/storage/database",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util",
        "//java/arcs/jvm/util/testutil",
        "//javatests/arcs/core/entity:lib",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/androidx/work",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
