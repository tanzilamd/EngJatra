#!/usr/bin/env python3
"""Check repository documentation paths, commands and public configuration names.

Standard-library-only; checks local consistency, not external URL availability.
"""
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
names = subprocess.check_output(
    ['git', 'ls-files', '-co', '--exclude-standard', '-z', '*.md'], cwd=ROOT
).decode().split('\0')
files = sorted({ROOT / name for name in names if name and (ROOT / name).is_file()})
scripts = json.loads((ROOT / 'package.json').read_text())['scripts']
public_config = set(re.findall(r'^(VITE_\w+)=', (ROOT / '.env.example').read_text(), re.M))
retired = ['CODEX_' + name + '_PROMPT.md' for name in ('MASTER', 'ALL_IN_ONE')]
errors = []

def check_path(source, target):
    target = unquote(target.split('#', 1)[0])
    if target and not (source.parent / target).exists():
        errors.append(f'{source.relative_to(ROOT)}: missing local target {target}')

for file in files:
    text = file.read_text(encoding='utf-8')
    for name in retired:
        if name in text:
            errors.append(f'{file.relative_to(ROOT)}: stale retired prompt reference')
    for target in re.findall(r'!?\[[^\]]*\]\(<?([^\s)>]+)>?\)', text):
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target):
            check_path(file, target)
    for target in set(re.findall(r'\bdocs/[A-Za-z0-9_./-]+\.md\b', text)):
        if not (ROOT / target).is_file():
            errors.append(f'{file.relative_to(ROOT)}: missing specification {target}')
    for command in set(re.findall(r'\bnpm run ([a-zA-Z0-9:_-]+)', text)):
        if command not in scripts:
            errors.append(f'{file.relative_to(ROOT)}: unknown npm script {command}')
    for name in set(re.findall(r'\bVITE_[A-Z0-9_]+\b', text)):
        if name not in public_config:
            errors.append(f'{file.relative_to(ROOT)}: undocumented public configuration {name}')

for name in ['AGENTS.md', 'README.md', 'CONTRIBUTING.md', 'docs/STATUS.md',
             'docs/HANDOFF.md', 'docs/CREDENTIALS_AND_DEPLOYMENT.md']:
    if not (ROOT / name).is_file():
        errors.append(f'missing permanent documentation {name}')
for name in retired:
    if (ROOT / name).exists():
        errors.append('completed development prompt still present')
if errors:
    print('\n'.join(sorted(set(errors))))
    raise SystemExit(1)
print(f'PASS {len(files)} Markdown files: local links/specifications, npm commands, '
      'public configuration names and retired prompt removal')
