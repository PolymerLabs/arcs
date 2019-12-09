load("@bazel_tools//tools/build_defs/repo:git.bzl", "new_git_repository")

# The version of Emscripten to use. Upgrade instructions:
# 1. Point to a new commit hash for the emsdk git repo.
# 2. Choose a newer version of Emscripten to install. Versions numbers are
#    listed here: https://github.com/emscripten-core/emsdk/blob/master/emscripten-releases-tags.txt
# 3. You might also need to update the cache. See `emscripten_cache/README.md`
#    for instructions.
#
# The directory structure might change between versions without warning, so
# the emsdk.BUILD file might need updating too (also, the bundled version of
# node might change too).
_emsdk_commit_hash = "a5082b232617c762cb65832429f896c838df2483"
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
        shallow_since = "1573752678 -0800",
        remote = "https://github.com/emscripten-core/emsdk.git",
        build_file = "//build_defs/emscripten:emsdk.BUILD",
        patch_cmds = [
            "./emsdk --embedded install %s" % _emscripten_version,
            "./emsdk --embedded activate %s" % _emscripten_version,
        ],
    )
