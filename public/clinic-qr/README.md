# Prescription branch QR codes

These static, high-contrast SVG QR codes use the exact links decoded from the clinic's printed prescription reference. Both links were opened and verified against the respective Google listings.

- Lily Chowk / Purani Basti: https://g.co/kgs/vEVcpd
- Devendra Nagar: https://share.google/9JxZ4CcV5dNd14DAy

The source configuration is `src/data/prescriptionBranchLocations.json`. Both prescription templates render the shared `PrescriptionBranchLocations` component. If a URL changes, regenerate its SVG too.

Generated locally with ReportLab's QR encoder, error correction H, four-module white quiet zone; no remote QR service or patient data is involved. Display/print size is 26 mm square, including the quiet zone. SVG preserves vector resolution when printed. Do not crop the white margin. The shared React component overlays the existing clinic logo on a small 8 × 4.2 mm white center plate. High error correction is enabled, and both QR codes were decoded successfully with this overlay in a print-density browser rendering.

Lily Chowk uses muted teal, and Devendra Nagar mixes muted teal and mauve; finder squares stay solid teal. QR quiet zones remain white, with larger center logos. The reference-style footer uses a mint/sea-green background, QR codes on the outer edges, and the clinic name, logo and branch addresses between them. Both gradient codes were decoded successfully from a print-density rendering. The generator reads colours and URLs from the same JSON configuration. Regenerate using `python3 scripts/generate-prescription-qr.py` in an environment with ReportLab installed; no runtime dependency is added to the application.
