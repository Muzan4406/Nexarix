from pathlib import Path
import fitz

source = Path("attached_assets/DrimPay_Pay-in_API_v2.0_Documentation_1790178840775.pdf")
output = Path(".agents/outputs/drimpay-pdf")
output.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    pixmap.save(output / f"page-{index + 1}.png")

print(f"Rendered {len(document)} pages to {output}")