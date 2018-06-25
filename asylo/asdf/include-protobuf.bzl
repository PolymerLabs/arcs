
load(
    "@com_google_asylo//asylo/bazel:patch_repository.bzl",
    "patch_repository",
)


def include_protobuf():
    # a more recent protobuf is required for compatability with the older version
    # of g++ included with Debian Jessie (currently in use by our Docker image).
    if "com_google_protobuf" not in native.existing_rules():
        patch_repository(
            name = "com_google_protobuf",
            strip_prefix = "protobuf-3.6.0",
            urls = ["https://github.com/google/protobuf/archive/v3.6.0.tar.gz"],
            sha256 = "50a5753995b3142627ac55cfd496cebc418a2e575ca0236e29033c67bd5665f4",
            patch = "@com_google_asylo//asylo/distrib:protobuf.patch",
        )
