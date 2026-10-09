#!/usr/bin/env python3
"""Audits uploaded EngJatra authoring/public research DATA. Python 3 stdlib only.
This is a NEW content QA tool for the handoff, NOT code from cancelled app prototypes.
Passing this script cannot certify English pedagogy, grammar or translations.
"""
import collections
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'content' / 'source'
PUBLIC = ROOT / 'content' / 'units-public'
BLOCKED = {'publication_status', 'content_status', 'human_reviewed', 'human_review', 'review_status',
           'cefr_word_sense_level_verified', 'verified_at', 'reviewer', 'review_state',
           'internal_notes', 'expert_verified', 'approval_status', 'teacher_review',
           'needs_human_editorial_review', 'human_expert_review_completed'}
LEVELS = ['P0', 'A1', 'A2', 'B1', 'B2', 'C1']
ERRORS = []

def load(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        ERRORS.append(f'invalid JSON: {path.relative_to(ROOT)}: {exc}')
        return None

def walk(obj, filename):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.lower() in BLOCKED:
                ERRORS.append(f'private admin metadata leaked: {filename}: {k}')
            if isinstance(v, list) and k == 'options' and 'correct_index' in obj:
                ci = obj['correct_index']
                if not isinstance(ci, int) or not (0 <= ci < len(v)):
                    ERRORS.append(f'invalid correct_index: {filename}')
                if len([str(x).strip().casefold() for x in v]) != len(set(str(x).strip().casefold() for x in v)):
                    ERRORS.append(f'duplicate options: {filename}')
            walk(v, filename)
    elif isinstance(obj, list):
        for v in obj:walk(v, filename)

source_files = {name: load(SRC / f'{name}.json') for name in (
    'units', 'vocabulary', 'grammar', 'conversations', 'offline_activities', 'extended_readings',
    'formative_checkpoints', 'level_groups', 'external_practice_resources', 'research_source_index')}
units = source_files['units'] or []
unit_ids = {x['id'] for x in units}
asserts = {'units':96, 'vocabulary':932, 'grammar':132, 'conversations':96, 'offline_activities':480, 'extended_readings':12}
for name, expected in asserts.items():
    data = source_files[name]
    actual = len(data) if isinstance(data, list) else -1
    if actual != expected:ERRORS.append(f'{name}: expected {expected}, got {actual}')
    else:print(f'PASS {name} count: {actual}')
if len(unit_ids) != len(units):ERRORS.append('unit ids not unique')
levels = collections.Counter(x.get('level') for x in units)
if any(levels[k] != 16 for k in LEVELS):ERRORS.append(f'level distribution: {levels}')
else:print('PASS six teaching bands: 16 units per level')
for name in ('grammar','conversations','offline_activities'):
    for x in source_files[name] or []:
        uid=x.get('unit_id')
        # Supplemental grammar cards are level-scoped and intentionally have no unit_id.
        if name=='grammar' and uid is None:
            if x.get('level') not in LEVELS:ERRORS.append(f'grammar level invalid for {x.get("id")}')
            continue
        if uid not in unit_ids:
            ERRORS.append(f'{name}: broken unit_id {uid}')
standalone_grammar=sum(1 for x in source_files['grammar'] or [] if x.get('unit_id') is None)
print(f'INFO supplemental band-scoped grammar cards without unit link: {standalone_grammar} (Codex must map or show in grammar library)')
for x in source_files['vocabulary'] or []:
    for u in x.get('units') or []:
        if u not in unit_ids:ERRORS.append(f'vocabulary: broken unit_id {u}')
public_files = list(PUBLIC.rglob('*.json'))
manifest = load(PUBLIC / 'manifest.json') or {}
if len(public_files) != 97:ERRORS.append(f'expected 96 unit JSON + manifest, found {len(public_files)}')
public_ids=set()
for f in public_files:
    content = load(f)
    if content is None:continue
    walk(content,str(f.relative_to(ROOT)))
    if f.name!='manifest.json':
        if f.stem not in unit_ids:ERRORS.append(f'unexpected unit JSON file {f.name}')
        if content.get('id')!=f.stem:ERRORS.append(f'unit file ID mismatch {f.name}')
        public_ids.add(content['id'])
if public_ids!=unit_ids:ERRORS.append('missing/extra public unit IDs')
manifest_units={uid for grp in manifest.get('levels',[]) for uid in grp.get('units',[])}
if manifest_units!=unit_ids:ERRORS.append('public manifest does not match unit IDs')
for f in SRC.rglob('*.json'):
    data = load(f)
    if data is not None:walk(data,str(f.relative_to(ROOT)))
for f in (ROOT/'brand').glob('*.svg'):
    try:ET.parse(f)
    except Exception as exc:ERRORS.append(f'bad SVG {f.name}: {exc}')
print('PASS public unit metadata strip and referential checks' if not ERRORS else 'FAIL content checks')
print('PASS starter SVG XML parsing' if not ERRORS else 'Review errors')
if ERRORS:
    print(f'FAILED ({len(ERRORS)}):')
    for error in ERRORS[:60]:print(' -',error)
    raise SystemExit(1)
print('ALL STRUCTURAL HANDOFF TESTS PASSED (semantic/editorial/production checks still required)')
