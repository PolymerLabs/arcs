# Utility routines and constants for use by Arcs shell tools.

ROOT=$(dirname $0)/..

YLW="\033[33m"
RED="\033[91m"
GRN="\033[92m"
MAG="\033[95m"
BLD="\033[1m"
END="\033[0m"
CMD="$BLD$YLW"

warn() {
    echo -e "$RED$BLD$1$END"
}

fail() {
    warn $1
    exit 1
}

status() {
    echo -e "$MAG$1$END"
}
