"""Build a reproducible source ZIP from an explicit public artifact allowlist."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parent.parent
out = root / 'submission/instead-tax-annotation-spec.zip'
files = [root / name for name in ('README.md', 'package.json', 'package-lock.json', 'tsconfig.json', '.gitignore', '.prettierrc.json')]
for directory in ('src', 'scripts', 'tests', 'docs', 'examples', '.github'):
    files.extend(p for p in (root / directory).rglob('*') if p.is_file() and p.suffix in ('.ts', '.json', '.pdf', '.md', '.py', '.yml'))
files.extend(root / 'output' / name for name in ('f1040-2025-filled.pdf', 'f1040-2025-debug.pdf'))
out.parent.mkdir(exist_ok=True)
with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(set(files)):
        archive.write(path, 'instead-tax-annotation-spec/' + str(path.relative_to(root)))
print(f'Packaged {len(set(files))} files: {out}')
print('SHA-256:', hashlib.sha256(out.read_bytes()).hexdigest())
