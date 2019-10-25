load(
    "@io_bazel_rules_kotlin//kotlin:kotlin.bzl",
    _kt_android_library = "kt_android_library",
    _kt_js_import = "kt_js_import",
    _kt_js_library = "kt_js_library",
    _kt_jvm_import = "kt_jvm_import",
    _kt_jvm_library = "kt_jvm_library",
    _kt_jvm_test = "kt_jvm_test",
)

kt_android_library = _kt_android_library

kt_jvm_library = _kt_jvm_library

kt_jvm_test = _kt_jvm_test

kt_jvm_import = _kt_jvm_import

kt_js_library = _kt_js_library

kt_js_import = _kt_js_import
