# X5GON Connect

This folder contains the library used to connect any repository to the OER network.


## Generating the SubResource Integrity (SRI) hashes (in Linux)

```bash
cat FILENAME.js | openssl dgst -sha384 -binary | openssl base64 -A
```

##