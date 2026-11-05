"""Blocks the network for the sandbox mimic test. Put this folder on PYTHONPATH.

Python imports sitecustomize at start up, so every skill script runs with sockets
that refuse to connect, bind, or resolve names. Local file work is unaffected.
"""
import socket


def _blocked(*_a, **_k):
    raise OSError("network is off in the NT sandbox mimic")


socket.socket.connect = _blocked
socket.socket.connect_ex = _blocked
socket.socket.bind = _blocked
socket.create_connection = _blocked
socket.getaddrinfo = _blocked
socket.gethostbyname = _blocked
