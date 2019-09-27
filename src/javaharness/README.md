## Arcs Android API

TODO: This code is undergoing refactoring, add packages descriptions, when complete.

Note there are symbolic links between pipes-shell and
the outer shells/pipes-shell directory, that means the pipes-shell
must be build first.

## Running

First, ensure xcode + command lines tools are installed.
Run install_dependencies.sh to insure Bazel and iBazel
are installed. Run tools/sigh build and shells/pipes-shell/web/deploy/deploy.sh

Then start Android Emulator and run:
bazel mobile-install //java/arcs/android/demo/app:app
