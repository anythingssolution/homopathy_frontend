"""Regenerate local prescription QR SVGs; requires ReportLab only at generation time."""
import json
from pathlib import Path
from reportlab.graphics.barcode.qr import QrCodeWidget

ROOT = Path(__file__).resolve().parents[1]
for branch in json.loads((ROOT / 'src/data/prescriptionBranchLocations.json').read_text()):
    qr = QrCodeWidget(branch['url'], barLevel='H')
    qr.qr.make()
    matrix = qr.qr.modules
    n = len(matrix)
    paths = {'body': [], 'finder': []}
    for y, row in enumerate(matrix):
        for x, dark in enumerate(row):
            if not dark:
                continue
            finder = (x < 7 and y < 7) or (x >= n - 7 and y < 7) or (x < 7 and y >= n - 7)
            paths['finder' if finder else 'body'].append(f'M{x+4} {y+4}h1v1h-1z')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 {n+8} {n+8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>'
    gradient = branch.get('qrGradient', [])
    if gradient:
        svg += f'<defs><linearGradient id="qr-mix" gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="{n+4}" y2="{n+4}">'
        for index, color in enumerate(gradient):
            svg += f'<stop offset="{100 * index / (len(gradient)-1):g}%" stop-color="{color}"/>'
        svg += '</linearGradient></defs>'
    for kind, color in [('body', branch['qrColor']), ('finder', branch['qrFinderColor'])]:
        if gradient:
            color = 'url(#qr-mix)' 
        svg += f'<path fill="{color}" d="{"".join(paths[kind])}"/>'
    svg += '</svg>\n'
    (ROOT / 'public' / branch['qrImage'].lstrip('/')).write_text(svg)
    print(f"{branch['id']}: {n} modules, error correction H")
