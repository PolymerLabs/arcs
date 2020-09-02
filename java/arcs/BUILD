licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# List of packages that can use Arcs.
# Public visibility for now.
package_group(
    name = "allowed-packages",
    packages = [
        "//...",
    ],
)

# Wider list of packages that can invoke Arcs CLI tools (via BUILD rules).
# Public visibility for now.
package_group(
    name = "allowed-packages-tools",
    includes = [":allowed-packages"],
    packages = [
        "//...",
    ],
)
