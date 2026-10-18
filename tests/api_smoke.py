"""Docker Compose smoke test: authorization, ownership and workflow restrictions.
Run against a freshly seeded, disposable test stack only.
"""
import json
import os
import urllib.error
import urllib.request

BASE = os.getenv('MIST_BASE_URL', 'http://127.0.0.1:8080')
PASSWORD = os.environ['MIST_DEMO_PASSWORD']


def call(method, path, data=None, token=None, expected=200, multipart=False):
    body = None
    headers = {}
    if data is not None:
        body = json.dumps(data).encode()
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(BASE + '/api' + path, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            status = response.status
            output = response.read()
    except urllib.error.HTTPError as error:
        status = error.code
        output = error.read()
    assert status == expected, f'{method} {path}: expected {expected} got {status}; body={output[:300]!r}'
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        return None


def login(name):
    return call('POST', '/auth/login', {'userName': name, 'password': PASSWORD})['accessToken']


student = login('demo.student')
student2 = login('demo.student2')
mentor = login('demo.mentor')
mentor2 = login('demo.mentor2')
curator = login('demo.curator')
curator2 = login('demo.curator2')
call('GET', '/documents', expected=401)
doc = call('POST', '/documents', {'kind': 'study', 'purpose': 'Synthetic academic study certificate'}, student, 201)
did = doc['id']
call('GET', '/documents/' + did, token=student2, expected=404)
call('GET', '/documents/' + did, token=curator2, expected=404)
call('GET', '/documents/' + did, token=mentor2, expected=404)
call('POST', f'/documents/{did}/issue', {'expectedRevision': 1}, curator, 409)
call('POST', f'/documents/{did}/process', {'expectedRevision': 1}, mentor, 403)
call('POST', f'/documents/{did}/cancel', {'expectedRevision': 1}, curator, 403)
call('POST', f'/documents/{did}/process', {'expectedRevision': 1}, curator)
call('POST', f'/documents/{did}/issue', {'expectedRevision': 1}, curator, 409)
call('POST', f'/documents/{did}/issue', {'expectedRevision': 2}, curator)
call('POST', f'/documents/{did}/issue', {'expectedRevision': 3}, curator, 409)
case = call('POST', '/cases', {'documentId': did, 'consent': True, 'motivation': 'A demonstrative dual education training project.'}, student, 201)
cid = case['id']
call('GET', '/cases/' + cid, token=student2, expected=404)
call('GET', '/cases/' + cid, token=mentor2, expected=404)
call('GET', '/cases/' + cid, token=curator2, expected=404)
call('GET', '/documents/' + did, token=mentor)
call('POST', f'/cases/{cid}/approve-plan', {'expectedRevision': 1, 'confirmed': False}, curator, 409)
call('POST', f'/cases/{cid}/accept', {'expectedRevision': 1, 'confirmed': False}, mentor)
call('POST', f'/cases/{cid}/approve-plan', {'expectedRevision': 2, 'confirmed': False}, curator)
call('POST', f'/cases/{cid}/complete', {'expectedRevision': 3, 'confirmed': True, 'comment': 'all verified'}, curator, 409)
assert call('GET', '/reports', token=student2)['reports'] == []
print('API SMOKE PASS: auth, role protection, resource scoping, document workflow, dual-plan ordering.')

# End-to-end report approvals, version histories and evidence authorization.
def submit_report(outcome, report_id=None, version=None, attach=False):
    boundary = 'MIST_TEST_BOUNDARY_a7d16f'
    fields = {
        'caseId': cid, 'outcomeId': outcome, 'hours': '16',
        'from': '2026-01-01', 'to': '2026-01-05',
        'summary': 'Completed the synthetic learning outcome with traceable changes and evidence.',
        'evidence': 'Local test fixture with no real student or company information.'
    }
    if report_id:
        fields['reportId'] = report_id
        fields['version'] = str(version)
    segments = []
    for key, value in fields.items():
        segments.append((f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n').encode())
    if attach:
        segments.append((f'--{boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="evidence.txt"\r\nContent-Type: text/plain\r\n\r\n').encode() + b'Synthetic evidence only; no student data.\r\n')
    segments.append((f'--{boundary}--\r\n').encode())
    req = urllib.request.Request(BASE + '/api/reports', data=b''.join(segments), method='POST', headers={
        'Authorization': f'Bearer {student}', 'Content-Type': f'multipart/form-data; boundary={boundary}'
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            assert r.status == 201, (r.status, r.read())
            return json.loads(r.read())
    except urllib.error.HTTPError as error:
        raise AssertionError((error.code, error.read().decode())) from error


def review(report_id, version, actor, decision='approve', expected=200):
    return call('POST', f'/reports/{report_id}/review', {
        'version': version, 'decision': decision, 'confirmed': decision == 'approve',
        'comment': 'Test review with explicit verification and documented feedback.'
    }, token=actor, expected=expected)


first = submit_report('db', attach=True)
rid = first['id']
call('GET', f'/reports/{rid}/versions', token=student2, expected=404)
call('GET', f'/reports/{rid}/versions', token=curator2, expected=404)
review(rid, 1, student, expected=403)
review(rid, 1, mentor2, expected=404)
review(rid, 1, curator, expected=409)
review(rid, 1, mentor)
review(rid, 1, curator, decision='return')
second = submit_report('db', rid, 1)
assert second['version'] == 2
review(rid, 1, mentor, expected=409)
review(rid, 2, curator, expected=409)
review(rid, 2, mentor)
review(rid, 2, curator)

hist = call('GET', f'/reports/{rid}/versions', token=student)
assert len(hist['versions']) == 2 and len(hist['decisions']) == 4, hist
assert hist['files'] and hist['files'][0]['fileName'] == 'evidence.txt'
file_id = hist['files'][0]['id']
call('GET', f'/reports/{rid}/files/{file_id}', token=student2, expected=404)
call('GET', f'/reports/{rid}/files/{file_id}', token=curator2, expected=404)
file_req = urllib.request.Request(BASE + f'/api/reports/{rid}/files/{file_id}', headers={'Authorization': f'Bearer {mentor}'})
with urllib.request.urlopen(file_req, timeout=15) as file_response:
    assert b'Synthetic evidence only' in file_response.read()

for outcome in ('import', 'quality'):
    r = submit_report(outcome)
    review(r['id'], 1, mentor)
    review(r['id'], 1, curator)

call('POST', f'/cases/{cid}/complete', {'expectedRevision': 3, 'confirmed': False, 'comment': 'The three outcomes were reviewed and confirmed.'}, curator, 409)
call('POST', f'/cases/{cid}/complete', {'expectedRevision': 3, 'confirmed': True, 'comment': 'The three outcomes were reviewed and confirmed.'}, curator)
assert any(d['kind'] == 'dual' for d in call('GET', '/documents', token=student))
assert call('GET', f'/audit/report/{rid}', token=curator2, expected=404) is None
assert len(call('GET', f'/audit/report/{rid}', token=student)) >= 6
print('API SMOKE PASS: report revisions, reviewer ordering, cross-tenant isolation, files, audit and completion.')