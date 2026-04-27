# IP Address Inspector

Classifies an IPv4 or IPv6 address offline: address type, plain-language description, optional CIDR range and RFC reference, and format conversions (IPv4: binary dotted octets, uppercase hex, 32-bit decimal; IPv6: expanded and compressed forms, plus embedded IPv4 when mapped).

No DNS lookups or network I/O. Logic lives in `instrument-core` (`network::ip_inspect`).
