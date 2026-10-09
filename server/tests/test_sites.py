import os
import tempfile
import unittest
from fastapi.testclient import TestClient

class SitesTest(unittest.TestCase):
    def test_camp_c_and_required_confirmations(self):
        from server.testserver import make_app
        from server import sites, status
        client = TestClient(make_app())
        self.assertIn('camp-a', [s['id'] for s in client.get('/sites').json()['sites']])
        created = client.post('/sites', json={'name':'Camp C','type':'camp'})
        self.assertEqual(created.status_code, 201)
        sid = created.json()['id']
        self.assertIn(sid, status.required_sites({'site':sid},{'site':'hospital-b'}))
        self.assertEqual(status.required_sites({'site':sid},{'site':'family-app'}), {sid})
        self.assertEqual(status.required_sites({'site':'phone-line'},{'site':'family-app'}), {'authority'})
        self.assertTrue(client.patch('/sites/'+sid,json={'active':False}).json()['active'] is False)
        self.assertIn(sid, status.required_sites({'site':sid},{'site':'hospital-b'}))
