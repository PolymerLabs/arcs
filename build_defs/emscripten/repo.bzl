load("@bazel_tools//tools/build_defs/repo:git.bzl", "new_git_repository")

# The version of Emscripten to use. Upgrade instructions:
# 1. Point to a new commit hash for the emsdk git repo.
# 2. Choose a newer version of Emscripten to install. Versions numbers are
#    listed here: https://github.com/emscripten-core/emsdk/blob/master/emscripten-releases-tags.txt
## The directory structure might change between versions without warning, so
# the emsdk.BUILD file might need updating too (also, the bundled version of
# node might change too).
_emsdk_commit_hash = "efc64876db1473312587a3f346be000a733bc16d"
_emscripten_version = "1.38.43"

def emsdk_repo():
    """Clones the emsdk repo, and "installs" an Emscripten toolchain.

    Emscripten is used to compile C++ to wasm. This rule clones the official
    emsdk repo, installs a version of Emscripten, and patches it with a simple
    BUILD rule. You can define new macros to invoke the Emscripten build tools.
    """
    new_git_repository(
        name = "emsdk",
        commit = _emsdk_commit_hash,
        shallow_since = "1567538206 -0700",
        remote = "https://github.com/emscripten-core/emsdk.git",
        build_file = "//build_defs/emscripten:emsdk.BUILD",
        patch_cmds = [
            "./emsdk --embedded install %s" % _emscripten_version,
            "./emsdk --embedded activate %s" % _emscripten_version,
        ],
    )
