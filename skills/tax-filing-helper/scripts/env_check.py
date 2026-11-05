#!/usr/bin/env python3
"""Print what this sandbox has. Standard library only. No network use."""
import importlib.util
import socket
import sys

NEEDED = []  # this skill needs only the standard library
OPTIONAL = ["openpyxl"]  # used only if a real .xlsx is wanted


def has(name):
    return importlib.util.find_spec(name) is not None


def network_off():
    """True when a connection cannot be opened. Tries a local, unrouted address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        s.connect(("192.0.2.1", 9))  # TEST-NET-1, never a real host
        s.close()
        return False
    except Exception:
        return True


def main():
    ok = sys.version_info >= (3, 8)
    print(f"python: {sys.version.split()[0]} ({'ok' if ok else 'too old, need 3.8 or newer'})")
    missing = [n for n in NEEDED if not has(n)]
    for n in NEEDED:
        print(f"needed {n}: {'ok' if has(n) else 'MISSING'}")
    for n in OPTIONAL:
        print(f"optional {n}: {'ok' if has(n) else 'not here (the CSV still works)'}")
    print(f"network: {'off' if network_off() else 'on'} (this skill works either way)")
    if not ok or missing:
        print("PROBLEM: tell the person in plain words what is missing and stop.")
        return 1
    print("READY")
    return 0


if __name__ == "__main__":
    sys.exit(main())
