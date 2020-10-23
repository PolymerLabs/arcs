licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# Group for Arcs internal packages.
# Public visibility for now.
package_group(
    name = "arcs-internal",
    packages = [
        "//...",
    ],
)

# List of packages that can use Arcs.
# Public visibility for now.
package_group(
    name = "allowed-packages",
    includes = [":arcs-internal"],
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
