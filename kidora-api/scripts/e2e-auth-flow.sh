#!/usr/bin/env bash
#
# End-to-end check of the whole sign-up chain, against a running API:
#
#   email + password  →  emailed code  →  choose role (+ student profile)
#                     →  (school/district) verification → pending → approved
#
# plus course access codes, course assignment, the role guards, uploads, and
# that the retired phone sign-in routes are really gone.
#
# Usage:
#   AUTH_TEST_EXPOSE_OTP=true npm run start:dev   # in another terminal
#   ./scripts/e2e-auth-flow.sh        # or: API=http://host:4000/api ./scripts/...
#
# The API must be started with AUTH_TEST_EXPOSE_OTP=true (never in
# production): it then returns the emailed code as `devCode` for this script.
# Real users only ever receive the code by email.
#
# Each run uses fresh addresses (e2e.<run>.<n>@example.com). To remove them later:
#   DELETE FROM "Course" WHERE id LIKE 'e2e-course-%';
#   DELETE FROM "User" WHERE email LIKE 'e2e.%@example.com';
#
set -uo pipefail

API="${API:-http://localhost:4000/api}"
PASS=0; FAIL=0

# Addresses unique to this run.
RUN="$(date +%s)"
mail() { printf 'e2e.%s.%s@example.com' "$RUN" "$1"; }
BOLD=$'\e[1m'; GREEN=$'\e[32m'; RED=$'\e[31m'; DIM=$'\e[2m'; OFF=$'\e[0m'

step()  { printf "\n${BOLD}%s${OFF}\n" "$*"; }
ok()    { PASS=$((PASS+1)); printf "  ${GREEN}✓${OFF} %s\n" "$*"; }
bad()   { FAIL=$((FAIL+1)); printf "  ${RED}✗${OFF} %s\n" "$*"; }
note()  { printf "    ${DIM}%s${OFF}\n" "$*" >&2; }

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

PW='Kidora2026!'

# Register, confirm the emailed code, and echo the verify response (tokens).
signin() {
  local email="$1" reg otp out
  reg=$(C -X POST "$API/auth/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"E2E $2\",\"email\":\"$email\",\"password\":\"$PW\"}")
  otp=$(get "$reg" '["devCode"]')
  if ! printf '%s' "$otp" | grep -Eq '^[0-9]{6}$'; then
    bad "no usable code for $email — $(printf '%s' "$reg" | head -c 160)" >&2
    echo '{}'; return
  fi
  out=$(C -X POST "$API/auth/email/verify" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"code\":\"$otp\"}")
  if [ "$(get "$out" '["accessToken"]')" = "<missing>" ]; then
    bad "could not sign in $email — $(printf '%s' "$out" | head -c 160)" >&2
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

PROBE=$(C -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"Probe\",\"email\":\"$(mail 0)\",\"password\":\"$PW\"}")
if [ "$(get "$PROBE" '["devCode"]')" = "<missing>" ]; then
  printf "${RED}No devCode in the response.${OFF} Start the API with AUTH_TEST_EXPOSE_OTP=true (development only).\n"
  exit 1
fi
ok "test hook is on (email codes come back in the response)"

# ------------------------------------------------------- 1. email sign-up

step "1 · Create account — email + emailed code"
REG=$(C -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"E2E Parent\",\"email\":\"$(mail 1)\",\"password\":\"$PW\"}")
is "registering issues no tokens"           "$(get "$REG" '["accessToken"]')" "<missing>"
is "it asks for the emailed code"           "$(get "$REG" '["needsEmailVerification"]')" "True"
is "signing in before verifying is refused" "$(code -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$(mail 1)\",\"password\":\"$PW\"}")" "403"
is "a wrong code is refused"                "$(code -X POST "$API/auth/email/verify" -H 'Content-Type: application/json' -d "{\"email\":\"$(mail 1)\",\"code\":\"000000\"}")" "400"
R1=$(C -X POST "$API/auth/email/verify" -H 'Content-Type: application/json' -d "{\"email\":\"$(mail 1)\",\"code\":\"$(get "$REG" '["devCode"]')\"}")
TOK1=$(get "$R1" '["accessToken"]')
is "the right code signs in"                "$(printf '%s' "$TOK1" | awk -F. '{print (NF==3)?"jwt":"no"}')" "jwt"
is "the account is asked to pick a role"    "$(get "$R1" '["needsRole"]')" "True"
is "no password hash is ever returned"      "$(get "$R1" '["user"]["passwordHash"]')" "<missing>"
is "the same code cannot be used twice"     "$(code -X POST "$API/auth/email/verify" -H 'Content-Type: application/json' -d "{\"email\":\"$(mail 1)\",\"code\":\"$(get "$REG" '["devCode"]')\"}")" "400"
is "password login works once verified"     "$(code -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$(mail 1)\",\"password\":\"$PW\"}")" "201"
is "a wrong password is refused"            "$(code -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$(mail 1)\",\"password\":\"nope-nope-1\"}")" "401"

step "1b · Phone sign-in is gone"
for r in phone/start phone/verify phone/request-otp otp/request otp/verify phone/request phone/confirm mfa/sms/send; do
  is "POST /auth/$r no longer exists" "$(code -X POST "$API/auth/$r" -H 'Content-Type: application/json' -d '{"phone":"+251911223344","code":"123456"}')" "404"
done
is "login by phone number is refused" "$(code -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"phone":"+251911223344","password":"x"}')" "400"

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
RS=$(signin "$(mail 3)" Leader)
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
RA=$(signin "$(mail 9)" Admin)
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

TOKI=$(get "$(signin "$(mail 4)" Deputy)" '["accessToken"]')
INV=$(C -X POST "$API/org/requests" -H "Authorization: Bearer $TOKI" -H 'Content-Type: application/json' \
  -d "{\"requestedRole\":\"SCHOOL_LEADER\",\"organizationName\":\"E2E Academy\",\"jobTitle\":\"Deputy\",\"joinCode\":\"$SCHOOL_CODE\"}")
is "a valid code approves on the spot"     "$(get "$INV" '["status"]')" "APPROVED"
is "and grants the role immediately"       "$(get "$INV" '["roleGranted"]')" "True"
is "marked auto-approved for the audit"    "$(get "$INV" '["request"]["autoApproved"]')" "True"
is "they join the existing school"         "$(get "$(C "$API/auth/me" -H "Authorization: Bearer $TOKI")" '["school"]["name"]')" "E2E Academy"

TOKW=$(get "$(signin "$(mail 5)" Wrong)" '["accessToken"]')
is "a wrong code is refused, not queued" \
   "$(code -X POST "$API/org/requests" -H "Authorization: Bearer $TOKW" -H 'Content-Type: application/json' -d '{"requestedRole":"SCHOOL_LEADER","organizationName":"Nowhere School","jobTitle":"Head","joinCode":"BADCOD"}')" "400"
is "a school code cannot buy district access" \
   "$(code -X POST "$API/org/requests" -H "Authorization: Bearer $TOKW" -H 'Content-Type: application/json' -d "{\"requestedRole\":\"DISTRICT_ADMIN\",\"organizationName\":\"Nowhere District\",\"jobTitle\":\"Head\",\"joinCode\":\"$SCHOOL_CODE\"}")" "400"
is "a parent cannot see a join code" \
   "$(get "$(C "$API/auth/me" -H "Authorization: Bearer $TOKW")" '["school"]["joinCode"]')" "<missing>"

# ---------------------------------------------------------- 9. the refusal

step "9 · Refused — with a reason, and another go"
RR=$(signin "$(mail 6)" Refused)
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

# -------------------------------------------------- 12. student profile step

step "12 · Student sign-up — date of birth, grade, school request"
RST=$(signin "$(mail 10)" Student)
TOKST=$(get "$RST" '["accessToken"]')
STID=$(get "$RST" '["user"]["id"]')
LEADER_SCHOOL=$(get "$(C "$API/auth/me" -H "Authorization: Bearer $TOKS")" '["schoolId"]')
is "school search needs a signed-in user" "$(code "$API/schools/search?q=E2E")" "401"
FOUND=$(C "$API/schools/search?q=E2E%20Academy" -H "Authorization: Bearer $TOKST")
is "school search finds the school" "$(printf '%s' "$FOUND" | grep -c "$LEADER_SCHOOL")" "1"
is "search never returns join codes" "$(printf '%s' "$FOUND" | grep -c joinCode)" "0"
is "a student must give date of birth and grade" \
   "$(code -X POST "$API/auth/role" -H "Authorization: Bearer $TOKST" -H 'Content-Type: application/json' -d '{"role":"CHILD"}')" "400"
is "an impossible age is refused" \
   "$(code -X POST "$API/auth/role" -H "Authorization: Bearer $TOKST" -H 'Content-Type: application/json' -d '{"role":"CHILD","dateOfBirth":"2025-01-01","gradeLevel":"Grade 5"}')" "400"
SROLE=$(C -X POST "$API/auth/role" -H "Authorization: Bearer $TOKST" -H 'Content-Type: application/json' \
  -d "{\"role\":\"CHILD\",\"dateOfBirth\":\"2015-05-20\",\"gradeLevel\":\"Grade 5\",\"schoolId\":\"$LEADER_SCHOOL\"}")
TOKST=$(get "$SROLE" '["accessToken"]')
is "the student role is saved"            "$(get "$SROLE" '["user"]["role"]')" "CHILD"
is "the grade is kept"                    "$(get "$SROLE" '["user"]["gradeLevel"]')" "Grade 5"
is "picking a school only requests it"    "$(get "$SROLE" '["user"]["requestedSchoolId"]')" "$LEADER_SCHOOL"
is "…and grants no membership"            "$(get "$SROLE" '["user"]["schoolId"]')" "None"
JR=$(C "$API/school/join-requests" -H "Authorization: Bearer $TOKS")
is "the school leader sees the request"   "$(printf '%s' "$JR" | grep -c "$STID")" "1"
is "a parent cannot see join requests"    "$(code "$API/school/join-requests" -H "Authorization: Bearer $TOK1")" "403"
is "the leader approves it"               "$(get "$(C -X POST "$API/school/join-requests/$STID/approve" -H "Authorization: Bearer $TOKS")" '["approved"]')" "True"
ME3=$(C "$API/auth/me" -H "Authorization: Bearer $TOKST")
is "the student is now in the school"     "$(get "$ME3" '["schoolId"]')" "$LEADER_SCHOOL"
is "the request is cleared"               "$(get "$ME3" '["requestedSchoolId"]')" "None"

# ------------------------------------------------------ 13. course access codes

step "13 · Course codes — teacher creates, student joins"
RT=$(signin "$(mail 11)" Teacher)
TOKT=$(get "$(C -X POST "$API/auth/role" -H "Authorization: Bearer $(get "$RT" '["accessToken"]')" -H 'Content-Type: application/json' -d '{"role":"TEACHER"}')" '["accessToken"]')
TID=$(get "$RT" '["user"]["id"]')
CID="e2e-course-$RUN"
sql "INSERT INTO \"Course\" (id, slug, title, published, status, access, \"teacherId\", \"publishedAt\", \"updatedAt\") VALUES ('$CID', '$CID', 'C++ Programming for Beginners', true, 'PUBLISHED', 'INVITE_ONLY', '$TID', now(), now());"
is "a new course has no code"             "$(get "$(C "$API/courses/$CID/access-code" -H "Authorization: Bearer $TOKT")" '["code"]')" "None"
CC=$(get "$(C -X POST "$API/courses/$CID/access-code/rotate" -H "Authorization: Bearer $TOKT")" '["code"]')
is "the teacher creates a readable code"  "$(printf '%s' "$CC" | grep -Eq '^CPP-[2-9A-HJKMNP-Z]{6}$' && echo yes || echo no)" "yes"
note "code: $CC"
is "another account cannot read the code" "$(code "$API/courses/$CID/access-code" -H "Authorization: Bearer $TOK1")" "403"
is "a parent cannot join with a code"     "$(code -X POST "$API/courses/access-code/join" -H "Authorization: Bearer $TOK1" -H 'Content-Type: application/json' -d "{\"code\":\"$CC\"}")" "403"
is "a wrong code is refused"              "$(code -X POST "$API/courses/access-code/join" -H "Authorization: Bearer $TOKST" -H 'Content-Type: application/json' -d '{"code":"CPP-222222"}')" "404"
LOW=$(printf '%s' "$CC" | tr 'A-Z' 'a-z' | tr -d '-')
J=$(C -X POST "$API/courses/access-code/join" -H "Authorization: Bearer $TOKST" -H 'Content-Type: application/json' -d "{\"code\":\"$LOW\"}")
is "lower case, no dash still joins"      "$(get "$J" '["enrolled"]')" "True"
is "…and names the course"                "$(get "$J" '["course"]["title"]')" "C++ Programming for Beginners"
is "joining again is harmless"            "$(get "$(C -X POST "$API/courses/access-code/join" -H "Authorization: Bearer $TOKST" -H 'Content-Type: application/json' -d "{\"code\":\"$CC\"}")" '["alreadyEnrolled"]')" "True"
is "the enrolment records its source"     "$(C "$API/learning/my-courses" -H "Authorization: Bearer $TOKST" | python3 -c "import sys,json; print([c['source'] for c in json.load(sys.stdin) if c['id']=='$CID'][0])" 2>/dev/null)" "ACCESS_CODE"
is "the student can open the course"      "$(get "$(C "$API/learning/courses/$CID/access" -H "Authorization: Bearer $TOKST")" '["allowed"]')" "True"

step "13b · Codes can be switched off; private courses stay private"
RS2=$(signin "$(mail 12)" Student2)
TOKS2=$(get "$(C -X POST "$API/auth/role" -H "Authorization: Bearer $(get "$RS2" '["accessToken"]')" -H 'Content-Type: application/json' -d '{"role":"CHILD","dateOfBirth":"2014-02-02","gradeLevel":"Grade 6"}')" '["accessToken"]')
S2ID=$(get "$RS2" '["user"]["id"]')
is "switching the code off"               "$(get "$(C -X PATCH "$API/courses/$CID/access-code" -H "Authorization: Bearer $TOKT" -H 'Content-Type: application/json' -d '{"enabled":false}')" '["enabled"]')" "False"
is "a switched-off code no longer joins"  "$(code -X POST "$API/courses/access-code/join" -H "Authorization: Bearer $TOKS2" -H 'Content-Type: application/json' -d "{\"code\":\"$CC\"}")" "404"
is "the old /courses/:id/enroll can't skip the invitation" "$(code -X POST "$API/courses/$CID/enroll" -H "Authorization: Bearer $TOKS2")" "403"
is "the public catalogue hides private courses" "$(C "$API/courses" | grep -c "$CID")" "0"
is "…and its detail page"                 "$(code "$API/courses/$CID")" "404"
NEWC=$(get "$(C -X POST "$API/courses/$CID/access-code/rotate" -H "Authorization: Bearer $TOKT")" '["code"]')
is "replacing the code retires the old one" "$(code -X POST "$API/courses/access-code/join" -H "Authorization: Bearer $TOKS2" -H 'Content-Type: application/json' -d "{\"code\":\"$CC\"}")" "404"
is "…and the new one works"               "$(get "$(C -X POST "$API/courses/access-code/join" -H "Authorization: Bearer $TOKS2" -H 'Content-Type: application/json' -d "{\"code\":\"$NEWC\"}")" '["enrolled"]')" "True"

step "13c · Guessing codes is stopped"
RS3=$(signin "$(mail 13)" Guesser)
TOKS3=$(get "$(C -X POST "$API/auth/role" -H "Authorization: Bearer $(get "$RS3" '["accessToken"]')" -H 'Content-Type: application/json' -d '{"role":"CHILD","dateOfBirth":"2013-03-03","gradeLevel":"Grade 7"}')" '["accessToken"]')
LAST=""
for i in $(seq 1 11); do
  LAST=$(code -X POST "$API/courses/access-code/join" -H "Authorization: Bearer $TOKS3" -H 'Content-Type: application/json' -d "{\"code\":\"ZZZ-$(printf '%06d' $i | tr 0-9 A-J)\"}")
done
is "the 11th wrong code in a row is refused" "$LAST" "429"

# ------------------------------------------------------------ 14. assigning

step "14 · Assigning courses — only to your own students"
RS4=$(signin "$(mail 14)" Child)
TOKS4=$(get "$(C -X POST "$API/auth/role" -H "Authorization: Bearer $(get "$RS4" '["accessToken"]')" -H 'Content-Type: application/json' -d '{"role":"CHILD","dateOfBirth":"2016-06-06","gradeLevel":"Grade 4"}')" '["accessToken"]')
S4ID=$(get "$RS4" '["user"]["id"]')
PID=$(get "$R1" '["user"]["id"]')
sql "INSERT INTO \"ParentStudent\" (id, \"parentId\", \"studentId\") VALUES ('e2e-ps-$RUN', '$PID', '$S4ID');"
is "a parent cannot assign to someone else's child" \
   "$(code -X POST "$API/courses/$CID/assign" -H "Authorization: Bearer $TOK1" -H 'Content-Type: application/json' -d "{\"studentIds\":[\"$S2ID\"]}")" "403"
PA=$(C -X POST "$API/courses/$CID/assign" -H "Authorization: Bearer $TOK1" -H 'Content-Type: application/json' -d "{\"studentIds\":[\"$S4ID\"]}")
is "a parent cannot use assigning to skip an invitation" "$(get "$PA" '["notAllowed"]')" "1"
is "a teacher cannot assign to students outside their classes" \
   "$(code -X POST "$API/courses/$CID/assign" -H "Authorization: Bearer $TOKT" -H 'Content-Type: application/json' -d "{\"studentIds\":[\"$S4ID\"]}")" "403"
is "a student cannot assign courses"      "$(code -X POST "$API/courses/$CID/assign" -H "Authorization: Bearer $TOKST" -H 'Content-Type: application/json' -d "{\"studentIds\":[\"$S4ID\"]}")" "403"
AA=$(C -X POST "$API/courses/$CID/assign" -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' -d "{\"studentIds\":[\"$S4ID\"]}")
is "staff can assign it"                  "$(get "$AA" '["enrolled"]')" "1"
is "…recorded as assigned by staff"       "$(C "$API/learning/my-courses" -H "Authorization: Bearer $TOKS4" | python3 -c "import sys,json; print([c['source'] for c in json.load(sys.stdin) if c['id']=='$CID'][0])" 2>/dev/null)" "ADMIN"

# ----------------------------------------------------------------- summary

printf "\n${BOLD}%d passed, %d failed${OFF}\n" "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
printf "${GREEN}Every step of the sign-up chain behaved.${OFF}\n"
