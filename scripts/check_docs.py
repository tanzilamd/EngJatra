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

# Guard the actual environment references against inventory drift, including
# dynamic Worker/provider fields declared in the interface/example files.
inventory = (ROOT / 'docs/ENVIRONMENT_VARIABLES.md').read_text()
source_paths = [ROOT / 'scripts', ROOT / 'packages', ROOT / 'apps', ROOT / 'workers']
variables = set()
for directory in source_paths:
    for source in directory.rglob('*.ts*'):
        if any(part in ('node_modules', 'dist', 'public') for part in source.parts):
            continue
        code = source.read_text()
        variables.update(re.findall(r'process\.env\.([A-Z][A-Z0-9_]+)', code))
        variables.update(re.findall(r'import\.meta\.env\.(VITE_[A-Z0-9_]+)', code))
for example in ['.env.example', '.dev.vars.example', '.deploy.env.example']:
    variables.update(re.findall(r'^([A-Z][A-Z0-9_]+)=', (ROOT / example).read_text(), re.M))
for variable in variables:
    if f'`{variable}`' not in inventory:
        errors.append(f'environment inventory missing actual variable {variable}')

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
