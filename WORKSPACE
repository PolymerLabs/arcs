load("//build_defs/emscripten:repo.bzl", "emsdk_repo")
load("//build_defs/kotlin_native:repo.bzl", "kotlin_native_repo")

# Install Emscripten via the emsdk.
emsdk_repo()

# Install the Kotlin-Native compiler
kotlin_native_repo()

maven_jar(
    name = "org_json_local",
    artifact = "org.json:json:20141113",
)

maven_jar(
    name = "flogger",
    artifact = "com.google.flogger:flogger:0.4",
)

maven_jar(
    name = "flogger_system_backend",
    artifact = "com.google.flogger:flogger-system-backend:0.4",
)

#git_repository(
#    name = "android_sdk_downloader",
#    remote = "https://github.com/quittle/bazel_android_sdk_downloader",
#    commit = "a08905c5571dc9a74027ec57c90ffad53d7f7efe",
#)

#load("@android_sdk_downloader//:rules.bzl", "android_sdk_repository")

#android_sdk_repository(
#    name = "androidsdk",
#    workspace_name = "arcs_javaharness",
#  api_level = 27,
#    build_tools_version = "27.0.3",
#)

android_sdk_repository(
    name = "androidsdk",
    api_level = 29,
)

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Needed for some reason now
http_archive(
    name = "rules_java",
    sha256 = "bc81f1ba47ef5cc68ad32225c3d0e70b8c6f6077663835438da8d5733f917598",
    strip_prefix = "rules_java-7cf3cefd652008d0a64a419c34c13bdca6c8f178",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_java/archive/7cf3cefd652008d0a64a419c34c13bdca6c8f178.zip",
        "https://github.com/bazelbuild/rules_java/archive/7cf3cefd652008d0a64a419c34c13bdca6c8f178.zip",
    ],
)

http_archive(
    name = "rules_proto",
    sha256 = "602e7161d9195e50246177e7c55b2f39950a9cf7366f74ed5f22fd45750cd208",
    strip_prefix = "rules_proto-97d8af4dc474595af3900dd85cb3a29ad28cc313",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_proto/archive/97d8af4dc474595af3900dd85cb3a29ad28cc313.tar.gz",
        "https://github.com/bazelbuild/rules_proto/archive/97d8af4dc474595af3900dd85cb3a29ad28cc313.tar.gz",
    ],
)


rules_kotlin_version = "legacy-modded-0_26_1-02"

rules_kotlin_sha = "245d0bc1511048aaf82afd0fa8a83e8c3b5afdff0ae4fbcae25e03bb2c6f1a1a"

http_archive(
    name = "io_bazel_rules_kotlin",
    sha256 = rules_kotlin_sha,
    strip_prefix = "rules_kotlin-%s" % rules_kotlin_version,
    type = "zip",
    urls = ["https://github.com/cgruber/rules_kotlin/archive/%s.zip" % rules_kotlin_version],
)

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kotlin_repositories", "kt_register_toolchains")

kotlin_repositories()  # if you want the default. Otherwise see custom kotlinc distribution below

kt_register_toolchains()  # to use the default toolchain, otherwise see toolchains below

# Load j2cl repository
http_archive(
    name = "com_google_j2cl",
    strip_prefix = "j2cl-master",
    url = "https://github.com/google/j2cl/archive/master.zip",
)

#http_archive(
#    name = "google_bazel_common",
#    strip_prefix = "bazel-common-1c225e62390566a9e88916471948ddd56e5f111c",
#    urls = ["https://github.com/google/bazel-common/archive/1c225e62390566a9e88916471948ddd56e5f111c.zip"],
#)

load("@com_google_j2cl//build_defs:repository.bzl", "load_j2cl_repo_deps")

load_j2cl_repo_deps()

load("@com_google_j2cl//build_defs:rules.bzl", "setup_j2cl_workspace")

setup_j2cl_workspace()

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

_JSINTEROP_BASE_VERSION = "master"

http_archive(
    name = "com_google_jsinterop_base",
    strip_prefix = "jsinterop-base-%s" % _JSINTEROP_BASE_VERSION,
    url = "https://github.com/google/jsinterop-base/archive/%s.zip" % _JSINTEROP_BASE_VERSION,
)

http_archive(
    name = "com_google_dagger",
    urls = ["https://github.com/google/dagger/archive/dagger-2.23.1.zip"],
)

maven_jar(
    name = "com_google_dagger_runtime",
    artifact = "com.google.dagger:dagger:jar:sources:2.23.1",
)

maven_jar(
    name = "javax_inject_source",
    artifact = "javax.inject:javax.inject:jar:sources:1",
)

maven_jar(
    name = "junit",
    artifact = "junit:junit:4.11",
)

http_archive(
    name = "com_google_elemental2",
    strip_prefix = "elemental2-master",
    url = "https://github.com/google/elemental2/archive/master.zip",
)

load("@com_google_elemental2//build_defs:repository.bzl", "load_elemental2_repo_deps")

load_elemental2_repo_deps()

load("@com_google_elemental2//build_defs:workspace.bzl", "setup_elemental2_workspace")

setup_elemental2_workspace()

http_archive(
    name = "build_bazel_rules_android",
    sha256 = "cd06d15dd8bb59926e4d65f9003bfc20f9da4b2519985c27e190cddc8b7a7806",
    strip_prefix = "rules_android-0.1.1",
    urls = ["https://github.com/bazelbuild/rules_android/archive/v0.1.1.zip"],
)

AUTO_VALUE_VERSION = "1.7"

maven_jar(
    name = "autovalue",
    artifact = "com.google.auto.value:auto-value:" + AUTO_VALUE_VERSION,
    sha1 = "fe8387764ed19460eda4f106849c664f51c07121",
)

maven_jar(
    name = "autovalue_annotations",
    artifact = "com.google.auto.value:auto-value-annotations:" + AUTO_VALUE_VERSION,
    sha1 = "5be124948ebdc7807df68207f35a0f23ce427f29",
)
