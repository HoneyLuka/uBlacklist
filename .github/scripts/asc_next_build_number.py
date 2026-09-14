#!/usr/bin/env python3
"""Compute the next App Store build number, following the YYYYMMDDNN rule.

NN is one more than the highest NN already uploaded to App Store Connect for
today's date (across all platforms of the app). If the App Store Connect API
is unavailable, or nothing was uploaded today, NN starts at 01.

Environment variables:
  ASC_KEY_ID      App Store Connect API key ID
  ASC_ISSUER_ID   App Store Connect API issuer ID
  ASC_API_KEY     Base64-encoded contents of the API key (.p8) file
  BUNDLE_ID       Bundle ID to look up (default: com.honeyluka.uBlacklist-for-Safari)

Usage:
  asc_next_build_number.py [override]

With an override argument, the script only validates it and echoes it back.
"""

import base64
import datetime
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

DEFAULT_BUNDLE_ID = "com.honeyluka.uBlacklist-for-Safari"
API_BASE = "https://api.appstoreconnect.apple.com"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def der_signature_to_raw(der: bytes) -> bytes:
    """Convert a DER-encoded ECDSA signature to the JWS raw R||S form."""
    if der[0] != 0x30:
        raise ValueError("not a DER SEQUENCE")
    index = 2
    if der[1] & 0x80:
        index = 2 + (der[1] & 0x7F)

    def read_int(i: int) -> tuple[bytes, int]:
        if der[i] != 0x02:
            raise ValueError("not a DER INTEGER")
        length = der[i + 1]
        return der[i + 2 : i + 2 + length], i + 2 + length

    r, index = read_int(index)
    s, index = read_int(index)
    return r.rjust(32, b"\x00") + s.rjust(32, b"\x00")


def make_jwt(key_id: str, issuer_id: str, key_pem: bytes) -> str:
    now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    payload = {"iss": issuer_id, "iat": now, "exp": now + 900}
    signing_input = (
        f"{b64url(json.dumps(header, separators=(',', ':')).encode())}."
        f"{b64url(json.dumps(payload, separators=(',', ':')).encode())}"
    ).encode()
    with tempfile.NamedTemporaryFile(suffix=".p8") as key_file:
        key_file.write(key_pem)
        key_file.flush()
        der = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_file.name],
            input=signing_input,
            capture_output=True,
            check=True,
        ).stdout
    return f"{signing_input.decode()}.{b64url(der_signature_to_raw(der))}"


def api_get(jwt: str, path: str) -> dict:
    request = urllib.request.Request(
        f"{API_BASE}{path}",
        headers={"Authorization": f"Bearer {jwt}"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def next_build_number(today: str) -> str:
    key_id = os.environ["ASC_KEY_ID"]
    issuer_id = os.environ["ASC_ISSUER_ID"]
    key_pem = base64.b64decode(os.environ["ASC_API_KEY"])
    bundle_id = os.environ.get("BUNDLE_ID", DEFAULT_BUNDLE_ID)
    jwt = make_jwt(key_id, issuer_id, key_pem)

    apps = api_get(jwt, f"/v1/apps?filter[bundleId]={bundle_id}&limit=1")
    app_id = apps["data"][0]["id"]

    builds = api_get(
        jwt,
        f"/v1/builds?filter[app]={app_id}&filter[expired]=false"
        "&limit=200&sort=-uploadedDate&fields[builds]=version",
    )
    pattern = re.compile(rf"^{today}(\d{{2}})$")
    sequence = max(
        (
            int(match.group(1))
            for build in builds["data"]
            if (match := pattern.match(build["attributes"]["version"]))
        ),
        default=0,
    )
    return f"{today}{sequence + 1:02d}"


def main() -> None:
    override = sys.argv[1].strip() if len(sys.argv) > 1 else ""
    if override:
        if not re.fullmatch(r"\d{10}", override):
            raise SystemExit(f"error: build number must be 10 digits (YYYYMMDDNN), got {override!r}")
        print(override)
        return

    today = datetime.datetime.now().strftime("%Y%m%d")
    try:
        number = next_build_number(today)
    except Exception as error:  # noqa: BLE001 - fall back instead of failing the release
        number = f"{today}01"
        print(f"warning: App Store Connect API unavailable ({error}); using {number}", file=sys.stderr)
    print(number)


if __name__ == "__main__":
    main()
