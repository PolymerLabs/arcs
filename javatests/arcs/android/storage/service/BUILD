load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_test_suite(
    name = "service",
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.storage.service",
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/android/crdt:crdt_exception_android_proto",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage:proxy_message_android_proto",
        "//java/arcs/android/storage/service",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk/android/storage",
        "//javatests/arcs/core/entity:lib",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)
