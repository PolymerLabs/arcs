load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "store-message",
    srcs = glob(["*Test.kt"]),
    package = "arcs.android.devtools",
    deps = [
        "//java/arcs/android/devtools",
        "//java/arcs/android/devtools:aidl",
        "//java/arcs/android/devtools/storage:devtools",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage/service",
        "//java/arcs/android/storage/service:aidl",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage:proxy",
        "//java/arcs/core/util",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/java/junit:junit-android",
        "//third_party/java/nanohttpd",
        "//third_party/java/nanohttpd:nanohttpd_websocket",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
