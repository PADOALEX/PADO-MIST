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
