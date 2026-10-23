import rasterio
import matplotlib.pyplot as plt


INPUT_FILE = "output/flood_mask.tiff"
OUTPUT_FILE = "output/flood_map.png"


with rasterio.open(INPUT_FILE) as src:

    mask = src.read(1)


plt.figure(figsize=(10, 8))

plt.imshow(
    mask,
    cmap="Blues"
)

plt.title(
    "JalRasta - Sentinel-1 Candidate Flood Detection"
)

plt.axis("off")

plt.tight_layout()

plt.savefig(
    OUTPUT_FILE,
    dpi=200,
    bbox_inches="tight"
)

plt.close()


print("\nFlood visualization created! 🌊")
print("Saved at:", OUTPUT_FILE)