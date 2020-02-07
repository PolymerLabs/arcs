load(
    "@build_bazel_rules_android//android:rules.bzl",
    _android_binary = "android_binary",
    _android_library = "android_library",
    _android_local_test = "android_local_test",
    _android_instrumentation_test = "android_instrumentation_test",
    _android_device = "android_device",
)

android_binary = _android_binary

android_library = _android_library

android_local_test = _android_local_test

android_instrumentation_test = _android_instrumentation_test

android_device = _android_device
