"""A stand-in LinkedIn for the journey tests: the sign-in (it signs in at once and sends the browser back), the token,
the member, the one Page they administer, posting, and the numbers of a Page post. Nothing leaves this machine.

    python linkedin.py <port>
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlsplit

PAGE = "urn:li:organization:2414183"
STATS = {"impressionCount": 940, "uniqueImpressionsCount": 610, "clickCount": 31, "likeCount": 44, "commentCount": 6, "shareCount": 3}
SCOPES = "r_basicprofile,w_member_social,r_member_postAnalytics,w_organization_social,r_organization_social,rw_organization_admin"


class LinkedIn(BaseHTTPRequestHandler):
    def answer(self, body, status=200, headers=None):
        data = json.dumps(body).encode() if body is not None else b""
        self.send_response(status)
        for name, value in {"Content-Type": "application/json", **(headers or {})}.items():
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlsplit(self.path)
        query = {name: values[0] for name, values in parse_qs(url.query).items()}
        if url.path == "/oauth/v2/authorization":
            back = f"{query['redirect_uri']}?{urlencode({'code': 'stand-in-code', 'state': query['state']})}"
            self.send_response(302)
            self.send_header("Location", back)
            self.end_headers()
        elif url.path == "/v2/me":
            self.answer({"id": "standin1", "localizedFirstName": "Ada", "localizedLastName": "Okafor", "vanityName": "ada-okafor"})
        elif url.path == "/rest/organizationAcls":
            self.answer({"paging": {"start": 0, "count": 50, "total": 1}, "elements": [{"role": "ADMINISTRATOR", "state": "APPROVED", "organization": PAGE}]})
        elif url.path.startswith("/rest/organizations/"):
            self.answer({"localizedName": "Grace Bakery", "vanityName": "grace-bakery"})
        elif url.path == "/rest/organizationalEntityShareStatistics":
            self.answer({"elements": [{"organizationalEntity": PAGE, "totalShareStatistics": STATS}]})
        elif url.path == "/rest/memberCreatorPostAnalytics":
            self.answer({"elements": [{"count": 12}]})
        elif url.path.startswith("/rest/networkSizes/"):
            self.answer({"firstDegreeSize": 1520})
        else:
            self.answer({"status": 404, "message": "Not in the stand-in"}, 404)

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length") or 0))
        path = urlsplit(self.path).path
        if path == "/oauth/v2/accessToken":
            self.answer({"access_token": "stand-in-token", "expires_in": 5184000, "scope": SCOPES})
        elif path == "/rest/posts":
            self.answer(None, 201, {"x-restli-id": "urn:li:share:7100000000000000001"})
        else:
            self.answer({"status": 404, "message": "Not in the stand-in"}, 404)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), LinkedIn).serve_forever()
