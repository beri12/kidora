#!/usr/bin/env bash
#
# End-to-end check of the whole sign-up chain, against a running API:
#
#   phone + OTP  →  choose role  →  (school/district) verification
#                →  pending  →  approved  →  permissions active
#
# plus the OTP rate limits, the upload rules and the role guards.
#
# Usage:
#   npm run start:dev                 # in another terminal
#   ./scripts/e2e-auth-flow.sh        # or: API=http://host:4000/api ./scripts/...
#
# Requires Twilio to be UNCONFIGURED, so the API returns the code as `devCode`.
# Each run uses a fresh block of numbers (+2519<run><n>), so runs never collide
# and nothing has to be cleaned up between them. To remove them all later:
#   DELETE FROM "OrgAccessRequest" WHERE "userId" IN (SELECT id FROM "User" WHERE phone LIKE '+2519%');
#   DELETE FROM "AuditLog"         WHERE "actorId" IN (SELECT id FROM "User" WHERE phone LIKE '+2519%');
#   DELETE FROM "User"             WHERE phone LIKE '+2519%';
#
set -uo pipefail

API="${API:-http://localhost:4000/api}"
PASS=0; FAIL=0

# A block of numbers unique to this run: +2519<4-digit run><4-digit index>.
RUN=$(printf '%04d' $(( $(date +%s) % 10000 )))
num() { printf '+2519%s%04d' "$RUN" "$1"; }
BOLD=$'\e[1m'; GREEN=$'\e[32m'; RED=$'\e[31m'; DIM=$'\e[2m'; OFF=$'\e[0m'

step()  { printf "\n${BOLD}%s${OFF}\n" "$*"; }
ok()    { PASS=$((PASS+1)); printf "  ${GREEN}✓${OFF} %s\n" "$*"; }
bad()   { FAIL=$((FAIL+1)); printf "  ${RED}✗${OFF} %s\n" "$*"; }
note()  { printf "    ${DIM}%s${OFF}\n" "$*"; }

# is <description> <actual> <expected>
is() {
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 — got '$2', wanted '$3'"; fi
}

C() { curl -s --noproxy '*' "$@"; }
code() { curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "$@"; }

# get <json> <python-expression on d>   e.g. get "$body" '["user"]["role"]'
get() { printf '%s' "$1" | python3 -c "import sys,json
try:
    d = json.load(sys.stdin)
except Exception:
    print('<not json>'); raise SystemExit
try:
    v = d$2
    print('None' if v is None else v)
except Exception:
    print('<missing>')" 2>/dev/null; }

sql() { printf '%s' "$1" | npx --no-install prisma db execute --stdin --schema prisma/schema.prisma >/dev/null 2>&1; }

# Asks for a code and echoes the response body.
#
# /auth/phone/start is throttled to 6 requests a minute per IP, because each
# one costs a real SMS. This script needs about ten of them, so it paces
# itself just under that limit rather than hammering and backing off — the
# throttle is a thing being tested, not an obstacle to route around.
OTP_MIN_GAP="${OTP_MIN_GAP:-12}"
# Kept in a file, not a variable: start_otp is called inside $(...), which is
# a subshell, so anything it assigns is lost the moment it returns.
LAST_OTP_FILE="$(mktemp)"; echo 0 > "$LAST_OTP_FILE"
trap 'rm -f "$LAST_OTP_FILE"' EXIT

start_otp() {
  local phone="$1" attempt=0 body http now wait
  while : ; do
    now=$(date +%s)
    wait=$(( $(cat "$LAST_OTP_FILE") + OTP_MIN_GAP - now ))
    [ "$wait" -gt 0 ] && sleep "$wait"
    date +%s > "$LAST_OTP_FILE"

    body=$(C -w '\n%{http_code}' -X POST "$API/auth/phone/start" \
      -H 'Content-Type: application/json' -d "{\"phone\":\"$phone\"}")
    http=$(printf '%s' "$body" | tail -n1)
    body=$(printf '%s' "$body" | sed '$d')

    case "$http" in
      200|201) printf '%s' "$body"; return 0 ;;
      429)
        attempt=$((attempt+1))
        [ "$attempt" -gt 6 ] && { printf '%s' "$body"; return 1; }
        note "throttled — waiting for the window to clear"
        sleep 62
        ;;
      *) printf '%s' "$body"; return 1 ;;
    esac
  done
}

# Sign in, creating the account on first use, and echo the whole response.
signin() {
  local phone="$1" start otp out
  start=$(start_otp "$phone") || { echo '{"error":"could not get a code"}'; return; }
  otp=$(get "$start" '["devCode"]')
  if [ "$otp" = "<missing>" ]; then echo '{"error":"no devCode — is Twilio configured?"}'; return; fi
  out=$(C -X POST "$API/auth/phone/verify" -H 'Content-Type: application/json' \
    -d "{\"phone\":\"$phone\",\"code\":\"$otp\"}")
  # Without this, a failed sign-in shows up later as a row of confusing 401s
  # on assertions that have nothing to do with the real problem.
  if [ "$(get "$out" '["accessToken"]')" = "<missing>" ]; then
    bad "could not sign in $phone — $(printf '%s' "$out" | head -c 160)" >&2
  fi
  printf '%s' "$out"
}

# ---------------------------------------------------------------- preflight

step "0 · Preflight"
HEALTH=$(code "$API/health")
if [ "$HEALTH" != "200" ]; then
  printf "${RED}The API is not answering at %s (got %s).${OFF}\n" "$API" "$HEALTH"
  printf "Start it with: npm run start:dev\n"
  exit 1
fi
ok "API is up at $API"

PROBE=$(start_otp "$(num 0)")
if [ "$(get "$PROBE" '["devCode"]')" = "<missing>" ]; then
  printf "${RED}No devCode in the response.${OFF} Twilio looks configured.\n"
  printf "This script needs the dev SMS fallback: unset TWILIO_SID / TWILIO_TOKEN and retry.\n"
  exit 1
fi
ok "dev SMS fallback is on (codes come back in the response)"
note "this run sends many codes quickly and will pause on the rate limit — allow a few minutes"

# ------------------------------------------------------- 1. phone sign-up

step "1 · Create account — phone + one-time code"
P1=$(num 1)
R1=$(signin "$P1")
TOK1=$(get "$R1" '["accessToken"]')
is "a new number creates an account"        "$(get "$R1" '["isNewUser"]')"  "True"
is "the account is asked to pick a role"    "$(get "$R1" '["needsRole"]')"  "True"
is "it starts on the default role"          "$(get "$R1" '["user"]["role"]')" "PARENT"
is "the number is recorded as verified"     "$(get "$R1" '["user"]["phoneVerified"]')" "True"
is "no password hash is ever returned"      "$(get "$R1" '["user"]["passwordHash"]')" "<missing>"

step "1b · The code is single use, guessing is capped"
P2=$(num 2)
S2=$(start_otp "$P2")
OTP2=$(get "$S2" '["devCode"]')
if [ "$OTP2" = "<missing>" ]; then
  bad "could not get a code for the single-use checks"
else
  # Asked again immediately. Two limits can answer here — the per-number
  # cooldown and the per-IP throttle — and which one gets there first depends
  # on how much traffic the run has already made. Either is a correct refusal,
  # so assert on the refusal and report which one spoke.
  COOL=$(C -w '\n%{http_code}' -X POST "$API/auth/phone/start" \
    -H 'Content-Type: application/json' -d "{\"phone\":\"$P2\"}")
  COOL_CODE=$(printf '%s' "$COOL" | tail -n1)
  is "a second code straight away is refused" "$COOL_CODE" "429"
  if printf '%s' "$COOL" | grep -qi 'wait'; then
    note "refused by the per-number cooldown"
  else
    note "refused by the per-IP throttle (the run is ahead of the cooldown)"
  fi
  is "a wrong code is refused" \
     "$(code -X POST "$API/auth/phone/verify" -H 'Content-Type: application/json' -d "{\"phone\":\"$P2\",\"code\":\"000000\"}")" "400"
  C -X POST "$API/auth/phone/verify" -H 'Content-Type: application/json' -d "{\"phone\":\"$P2\",\"code\":\"$OTP2\"}" >/dev/null
  is "the same code cannot be used twice" \
     "$(code -X POST "$API/auth/phone/verify" -H 'Content-Type: application/json' -d "{\"phone\":\"$P2\",\"code\":\"$OTP2\"}")" "400"
fi

# ------------------------------------------------------------ 2. role step

step "2 · Choose role — parent is granted at once"
ROLE2=$(C -X POST "$API/auth/role" -H "Authorization: Bearer $(get "$R1" '["accessToken"]')" \
  -H 'Content-Type: application/json' -d '{"role":"PARENT","name":"Test Parent"}')
is "the role is written"                 "$(get "$ROLE2" '["user"]["role"]')" "PARENT"
is "it is marked as answered"            "$(get "$ROLE2" '["user"]["roleConfirmed"]')" "True"
is "a fresh token pair comes back"       "$(get "$ROLE2" '["accessToken"]' | awk -F. '{print (NF==3)?"jwt":"no"}')" "jwt"
is "answering twice is refused"          "$(code -X POST "$API/auth/role" -H "Authorization: Bearer $TOK1" -H 'Content-Type: application/json' -d '{"role":"TEACHER"}')" "403"
is "ADMIN cannot be self-assigned"       "$(code -X POST "$API/auth/role" -H "Authorization: Bearer $TOK1" -H 'Content-Type: application/json' -d '{"role":"ADMIN"}')" "400"

step "3 · Choose role — School Leader is NOT granted"
PS=$(num 3)
RS=$(signin "$PS")
TOKS=$(get "$RS" '["accessToken"]')
SEL=$(C -X POST "$API/auth/role" -H "Authorization: Bearer $TOKS" -H 'Content-Type: application/json' \
  -d '{"role":"SCHOOL_LEADER","name":"Marta Alemu"}')
is "the API asks for verification"       "$(get "$SEL" '["needsVerification"]')" "True"
is "the role is left alone"              "$(get "$SEL" '["user"]["role"]')" "PARENT"
is "no token is minted for a role nobody has" "$(get "$SEL" '["accessToken"]')" "<missing>"
is "the name is kept for the reviewer"   "$(get "$SEL" '["user"]["name"]')" "Marta Alemu"

# --------------------------------------------------- 4. verification, pending

step "4 · Verification — submit for review"
REQ=$(C -X POST "$API/org/requests" -H "Authorization: Bearer $TOKS" -H 'Content-Type: application/json' \
  -d '{"requestedRole":"SCHOOL_LEADER","organizationName":"E2E Academy","jobTitle":"Principal","country":"Ethiopia","workEmail":"head@e2e.edu.et","studentCount":480}')
is "the claim is recorded as pending"    "$(get "$REQ" '["status"]')" "PENDING"
is "nothing is granted"                  "$(get "$REQ" '["roleGranted"]')" "False"

step "5 · Pending — still no administrative access"
ME=$(C "$API/auth/me" -H "Authorization: Bearer $TOKS")
is "the role has not moved"              "$(get "$ME" '["role"]')" "PARENT"
is "no school is linked"                 "$(get "$ME" '["schoolId"]')" "None"
is "the status is visible to them"       "$(get "$ME" '["orgRequest"]["status"]')" "PENDING"
is "a second claim is refused"           "$(code -X POST "$API/org/requests" -H "Authorization: Bearer $TOKS" -H 'Content-Type: application/json' -d '{"requestedRole":"SCHOOL_LEADER","organizationName":"E2E Academy","jobTitle":"Principal"}')" "409"
is "they cannot open the review queue"   "$(code "$API/admin/org-requests" -H "Authorization: Bearer $TOKS")" "403"
is "they cannot approve themselves"      "$(code -X POST "$API/admin/org-requests/$(get "$REQ" '["request"]["id"]')/approve" -H "Authorization: Bearer $TOKS" -H 'Content-Type: application/json' -d '{}')" "403"

# --------------------------------------------------------- 6. staff approval

step "6 · Approved — by Kidora staff"
# A reviewer. Promoted directly in the database, because nothing in the API
# can hand out SUPER_ADMIN — which is the point.
PA=$(num 9)
RA=$(signin "$PA")
AID=$(get "$RA" '["user"]["id"]')
sql "UPDATE \"User\" SET role = 'SUPER_ADMIN', \"roleConfirmed\" = true WHERE id = '$AID';"

# One refresh is enough to pick the new role up — no second sign-in, and no
# second SMS. That this works at all is the refresh fix being exercised.
ATOK=$(get "$(C -X POST "$API/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$(get "$RA" '["refreshToken"]')\"}")" '["accessToken"]')
is "a promotion reaches the token on refresh" \
   "$(printf '%s' "$ATOK" | cut -d. -f2 | python3 -c "
import sys,base64,json
p=sys.stdin.read().strip(); p+='='*(-len(p)%4)
print(json.loads(base64.urlsafe_b64decode(p))['role'])" 2>/dev/null)" "SUPER_ADMIN"
is "staff can open the review queue"     "$(code "$API/admin/org-requests?status=PENDING" -H "Authorization: Bearer $ATOK")" "200"

RID=$(get "$REQ" '["request"]["id"]')
APP=$(C -X POST "$API/admin/org-requests/$RID/approve" -H "Authorization: Bearer $ATOK" \
  -H 'Content-Type: application/json' -d '{"decisionNote":"Checked against the register."}')
is "the request is approved"             "$(get "$APP" '["status"]')" "APPROVED"
is "a school is created and linked"      "$(get "$APP" '["schoolId"]' | wc -c | awk '{print ($1>5)?"yes":"no"}')" "yes"
is "approving twice is refused"          "$(code -X POST "$API/admin/org-requests/$RID/approve" -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' -d '{}')" "409"

# ------------------------------------------------- 7. permissions activated

step "7 · Permissions activated"
ME2=$(C "$API/auth/me" -H "Authorization: Bearer $TOKS")
is "the account now holds the role"      "$(get "$ME2" '["role"]')" "SCHOOL_LEADER"
is "and belongs to the school"           "$(get "$ME2" '["schoolId"]' | wc -c | awk '{print ($1>5)?"yes":"no"}')" "yes"

NEW=$(C -X POST "$API/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$(get "$RS" '["refreshToken"]')\"}")
CLAIM=$(printf '%s' "$(get "$NEW" '["accessToken"]')" | cut -d. -f2 | python3 -c "
import sys,base64,json
p=sys.stdin.read().strip(); p+='='*(-len(p)%4)
print(json.loads(base64.urlsafe_b64decode(p))['role'])" 2>/dev/null)
is "a refreshed token carries the new role" "$CLAIM" "SCHOOL_LEADER"
note "this is the step that was broken before: refresh used to copy the old role forward"

# ------------------------------------------------------ 8. invitation route

step "8 · Invitation — a colleague joins instantly with the code"
# An approved leader sees their school's join code on their own profile,
# which is exactly how they would hand it to a colleague.
SCHOOL_CODE=$(get "$(C "$API/auth/me" -H "Authorization: Bearer $TOKS")" '["school"]["joinCode"]')
is "the approved leader can see their join code" \
   "$(printf '%s' "$SCHOOL_CODE" | grep -Eq '^[A-Z2-9]{6}$' && echo yes || echo no)" "yes"

PI=$(num 4)
TOKI=$(get "$(signin "$PI")" '["accessToken"]')
INV=$(C -X POST "$API/org/requests" -H "Authorization: Bearer $TOKI" -H 'Content-Type: application/json' \
  -d "{\"requestedRole\":\"SCHOOL_LEADER\",\"organizationName\":\"E2E Academy\",\"jobTitle\":\"Deputy\",\"joinCode\":\"$SCHOOL_CODE\"}")
is "a valid code approves on the spot"     "$(get "$INV" '["status"]')" "APPROVED"
is "and grants the role immediately"       "$(get "$INV" '["roleGranted"]')" "True"
is "marked auto-approved for the audit"    "$(get "$INV" '["request"]["autoApproved"]')" "True"
is "they join the existing school"         "$(get "$(C "$API/auth/me" -H "Authorization: Bearer $TOKI")" '["school"]["name"]')" "E2E Academy"

PW=$(num 5)
TOKW=$(get "$(signin "$PW")" '["accessToken"]')
is "a wrong code is refused, not queued" \
   "$(code -X POST "$API/org/requests" -H "Authorization: Bearer $TOKW" -H 'Content-Type: application/json' -d '{"requestedRole":"SCHOOL_LEADER","organizationName":"Nowhere School","jobTitle":"Head","joinCode":"BADCOD"}')" "400"
is "a school code cannot buy district access" \
   "$(code -X POST "$API/org/requests" -H "Authorization: Bearer $TOKW" -H 'Content-Type: application/json' -d "{\"requestedRole\":\"DISTRICT_ADMIN\",\"organizationName\":\"Nowhere District\",\"jobTitle\":\"Head\",\"joinCode\":\"$SCHOOL_CODE\"}")" "400"
is "a parent cannot see a join code" \
   "$(get "$(C "$API/auth/me" -H "Authorization: Bearer $TOKW")" '["school"]["joinCode"]')" "<missing>"

# ---------------------------------------------------------- 9. the refusal

step "9 · Refused — with a reason, and another go"
PR=$(num 6)
RR=$(signin "$PR")
TOKR=$(get "$RR" '["accessToken"]')
RREQ=$(C -X POST "$API/org/requests" -H "Authorization: Bearer $TOKR" -H 'Content-Type: application/json' \
  -d '{"requestedRole":"DISTRICT_ADMIN","organizationName":"Ghost District","jobTitle":"Superintendent"}')
RRID=$(get "$RREQ" '["request"]["id"]')
is "refusing without a reason is refused" \
   "$(code -X POST "$API/admin/org-requests/$RRID/reject" -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' -d '{}')" "400"
REJ=$(C -X POST "$API/admin/org-requests/$RRID/reject" -H "Authorization: Bearer $ATOK" \
  -H 'Content-Type: application/json' -d '{"decisionNote":"No public record of this district."}')
is "it is refused"                       "$(get "$REJ" '["status"]')" "REJECTED"
is "the applicant is told why"           "$(get "$(C "$API/org/requests/me" -H "Authorization: Bearer $TOKR")" '["decisionNote"]')" "No public record of this district."
is "their role never moved"              "$(get "$(C "$API/auth/me" -H "Authorization: Bearer $TOKR")" '["role"]')" "PARENT"
is "they may apply again"                "$(code -X POST "$API/org/requests" -H "Authorization: Bearer $TOKR" -H 'Content-Type: application/json' -d '{"requestedRole":"DISTRICT_ADMIN","organizationName":"Ghost District","jobTitle":"Superintendent","note":"Attaching the gazette entry"}')" "201"

# ------------------------------------------------------------- 10. uploads

step "10 · Uploads"
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/e2e.png
cp /tmp/e2e.png /tmp/e2e-disguised.html
is "an image uploads"                    "$(code -X POST "$API/media/upload/image" -H "Authorization: Bearer $TOKS" -F file=@/tmp/e2e.png)" "201"
is "html dressed as an image is refused" "$(code -X POST "$API/media/upload/image" -H "Authorization: Bearer $TOKS" -F "file=@/tmp/e2e-disguised.html;type=image/png")" "400"
is "uploading needs a signed-in user"    "$(code -X POST "$API/media/upload/image" -F file=@/tmp/e2e.png)" "401"
python3 -c "open('/tmp/e2e-big.vtt','w').write('WEBVTT\n'+'x'*3000000)"
is "an oversized file is refused"        "$(code -X POST "$API/media/upload/subtitle" -H "Authorization: Bearer $TOKS" -F file=@/tmp/e2e-big.vtt)" "413"
rm -f /tmp/e2e.png /tmp/e2e-disguised.html /tmp/e2e-big.vtt

step "11 · Social providers"
is "the app can ask which are configured" "$(code "$API/auth/providers")" "200"
note "configured right now: $(get "$(C "$API/auth/providers")" '["providers"]')"

# ----------------------------------------------------------------- summary

printf "\n${BOLD}%d passed, %d failed${OFF}\n" "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
printf "${GREEN}Every step of the sign-up chain behaved.${OFF}\n"
