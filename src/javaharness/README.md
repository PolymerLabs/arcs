## Java glue layer for Shell JS and Android 

Code here implements a thin layer that is portable between 
Android and J2CL->JS so allow developing rapidly without 
rebuilding Android apps.

Code in arcs/api is platform independent and should have no dependencies on Android API runtime.

Code in arcs/webimpl is platform dependent and expected to be reimplemented in arcs/androidimpl

Native particles will reside and be registered in arcs/nativeparticles

Note there are symbolic links between pipes-shell and
the outer shells/pipes-shell directory, that means the pipes-shell 
must be build first.

## Running

First, ensure xcode + command lines tools are installed.
Run install_dependencies.sh to insure Bazel and iBazel
are installed. Run tools/sigh build and shells/pipes-shell/web/deploy/deploy.sh

Then launch hotreload.sh and everything should build and run a server on port
6006. 

Visit [http://localhost:6006/javaharness_dev.html?user=harness&solo=particles/PipeApps/canonical.recipes&log=2] 
to try it out.
