load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_test_suite(
    name = "crdt",
    srcs = glob(["*Test.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.crdt",
    deps = [
        ":crdt-test-util",
        "//java/arcs/android/crdt",  # buildcleaner: keep
        "//java/arcs/android/crdt:crdt_entity_android_proto",
        "//java/arcs/android/crdt:crdt_exception_android_proto",
        "//java/arcs/android/crdt:referencable_android_proto",
        "//java/arcs/android/util",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/testutil:generators",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity/testutil",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil:generator_util",
        "//java/arcs/core/util:utils-platform-dependencies",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
    ],
)

arcs_kt_android_library(
    name = "crdt-test-util",
    testonly = 1,
    srcs = [
        "CrdtParcelablesInvariants.kt",
        "CrdtParcelablesTestUtils.kt",
    ],
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/core/crdt",
        "//third_party/java/truth:truth-android",
    ],
)
