"""Offline tests for private refinement intake durability and copy publication."""
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

spec=importlib.util.spec_from_file_location('echo_refine',Path(__file__).resolve().parents[1]/'tools/echo-refine.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class RefinementTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.layout={'slots':[{'id':'hero','copy_from':'1.HERO'}],'order':['hero'],'hidden':['hero'],'copies':{}}
        self.session={'ok':True,'layouts':{'2':self.layout},'ratings':[{'cid':'i1:1.HERO','rater':'owner','style':5}]}
        self.copy={'slots':[{'id':'hero','copy_from':'1.HERO','copy':{'title':'Working options first','body':['Rate the options; we refine your choice.']}}]}
        self.item={'id':'request_one','sid':'private_session','iteration':2}
        self.calls=[]
    def tearDown(self):self.temp.cleanup()
    def api(self,method,path,secret=None,data=None):
        self.calls.append((method,path,data))
        if path.startswith('/requests?'):return {'ok':True,'requests':[self.item]}
        if method=='GET':return self.session
        return {'ok':True}
    def test_complete_preserves_order_hidden_and_ratings(self):
        key=m.hashlib.sha256(self.item['id'].encode()).hexdigest()[:24]
        m.private_write(self.root/(key+'.json'),{'request':self.item})
        result=m.complete(self.root,self.item['id'],self.copy,'private_token',self.api)
        put=self.calls[1][2]['layout']
        self.assertEqual(put['hidden'],['hero']);self.assertEqual(put['order'],['hero'])
        self.assertEqual(self.session['ratings'][0]['style'],5)
        self.assertEqual(self.calls[2][2]['status'],'ready');self.assertEqual(result['slots'],1)
        self.assertEqual((self.root/(key+'.receipt.json')).stat().st_mode & 0o777,0o600)
    def test_publication_failure_never_marks_ready(self):
        key=m.hashlib.sha256(self.item['id'].encode()).hexdigest()[:24];m.private_write(self.root/(key+'.json'),{'request':self.item})
        def fail(method,path,secret=None,data=None):
            if method=='PUT':raise RuntimeError('offline')
            return self.api(method,path,secret,data)
        with self.assertRaises(RuntimeError):m.complete(self.root,self.item['id'],self.copy,'private',fail)
        self.assertFalse(any(v[0]=='POST' for v in self.calls))
    def test_copy_source_change_unknown_duplicate_missing_rejected(self):
        for slots in [[],[{'id':'other'}],self.copy['slots']*2,[{**self.copy['slots'][0],'copy_from':'2.HERO'}]]:
            with self.subTest(slots=slots):
                with self.assertRaises(ValueError):m.merge_refinement(self.layout,{'slots':slots},'request_one')
    def test_private_packet_atomic_and_identity_safe(self):
        p=self.root/'job.json';m.private_write(p,{'note':'first'});m.private_write(p,{'note':'second'})
        self.assertEqual(json.loads(p.read_text()),{'note':'second'});self.assertEqual(p.stat().st_mode&0o777,0o600)
        for value in ['../bad','foo/bar','',None]:
            with self.assertRaises(ValueError):m.identity(value)
    def test_intake_job_and_task_exist_before_working_and_replay_dedup(self):
        conn=sqlite3.connect(':memory:');conn.execute('CREATE TABLE tasks(id TEXT)')
        class Read:
            def __enter__(self):return conn
            def __exit__(self,*args):pass
        def create(**data):conn.execute('INSERT INTO tasks VALUES(?)',(data['task_id'],))
        ledger=Mock();ledger.get_task.side_effect=lambda key: {} if conn.execute('SELECT 1 FROM tasks WHERE id=?',(key,)).fetchone() else (_ for _ in ()).throw(missing('missing'))
        ledger.create_task.side_effect=create
        app=SimpleNamespace(ledger=ledger,db=SimpleNamespace(connect_read_only=lambda:Read()),settings=SimpleNamespace(agents={'ba':SimpleNamespace(goals=['one','two','three'])}))
        def fetch(method,path,secret=None,data=None):
            if method=='POST':
                self.assertEqual(len(list(self.root.glob('*.json'))),1)
                self.assertEqual(conn.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],1)
            return self.api(method,path,secret,data)
        self.assertEqual(m.intake(app,self.root,'private',fetch)['tasks_created'],1)
        self.assertEqual(m.intake(app,self.root,'private',fetch)['tasks_created'],0)
        self.assertEqual(ledger.create_task.call_count,1)
        self.item={**self.item,'sid':'changed'}
        with self.assertRaises(ValueError):m.intake(app,self.root,'private',fetch)

class ValidationError(Exception):pass
missing=ValidationError
if __name__=='__main__':unittest.main()
