# Basic Auth Header

Encodes a username and password into an `Authorization: Basic …` value (standard Base64 of `user:pass`), or decodes a `Basic …` header (splits on the first `:` only). Marked sensitive: input is not stored in history.
