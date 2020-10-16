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
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage:proxy",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/util",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
