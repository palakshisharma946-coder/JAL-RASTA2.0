import numpy as np
import rasterio


def read_sar(file_path):
    """
    Read Sentinel-1 SAR TIFF.
    """

    with rasterio.open(file_path) as src:

        print("\nFILE:", file_path)
        print("Bands:", src.count)
        print("Width:", src.width)
        print("Height:", src.height)
        print("Dtype:", src.dtypes)
        print("Nodata:", src.nodata)

        vv = src.read(1)
        vh = src.read(2) if src.count >= 2 else None

        print("VV min:", np.nanmin(vv))
        print("VV max:", np.nanmax(vv))
        print("VV NaN:", np.isnan(vv).sum())

        if vh is not None:
            print("VH min:", np.nanmin(vh))
            print("VH max:", np.nanmax(vh))
            print("VH NaN:", np.isnan(vh).sum())

        profile = src.profile

    return vv, vh, profile

def to_db(data):
    """
    Convert SAR linear power to decibel.
    """

    data = np.maximum(data, 1e-10)

    return 10 * np.log10(data)


def calculate_change(before_vv, after_vv):
    """
    Calculate VV backscatter change.
    """

    before_db = to_db(before_vv)
    after_db = to_db(after_vv)

    change = after_db - before_db

    return change


def create_flood_mask(change, threshold=-3.0):
    """
    Create candidate flood mask.

    A significant decrease in backscatter
    can indicate newly inundated surfaces.

    This is a candidate mask, NOT final truth.
    """

    flood_mask = change < threshold

    return flood_mask


def calculate_percentage(mask):

    total = mask.size

    if total == 0:
        return 0

    flooded = np.count_nonzero(mask)

    return (flooded / total) * 100


def save_mask(mask, profile, output_path):

    profile.update(
        dtype=rasterio.uint8,
        count=1,
        compress="lzw"
    )

    with rasterio.open(
        output_path,
        "w",
        **profile
    ) as dst:

        dst.write(
            mask.astype(np.uint8),
            1
        )


if __name__ == "__main__":

    before_path = (
        "output/before_flood.tiff"
    )

    after_path = (
        "output/after_event.tiff"
    )

    output_path = (
        "output/flood_mask.tiff"
    )


    print(
        "\nReading BEFORE SAR..."
    )

    before_vv, before_vh, profile = (
        read_sar(before_path)
    )


    print(
        "Reading AFTER SAR..."
    )

    after_vv, after_vh, _ = (
        read_sar(after_path)
    )


    print(
        "\nCalculating SAR change..."
    )

    change = calculate_change(
        before_vv,
        after_vv
    )
    print("BEFORE:", np.nanmin(before_vv), np.nanmax(before_vv), np.nanmean(before_vv))
    print("AFTER :", np.nanmin(after_vv), np.nanmax(after_vv), np.nanmean(after_vv))
    print("BEFORE NaN:", np.isnan(before_vv).sum())
    print("AFTER NaN :", np.isnan(after_vv).sum())
    print("\nSAR CHANGE STATISTICS")

    print("Minimum change:", np.nanmin(change))
    print("Maximum change:", np.nanmax(change))
    print("Average change:", np.nanmean(change))


    print(
        "Creating candidate flood mask..."
    )

    mask = create_flood_mask(
        change
    )


    percentage = calculate_percentage(
        mask
    )


    save_mask(
        mask,
        profile,
        output_path
    )


    print("\n==============================")

    print(
        "SAR FLOOD ANALYSIS COMPLETE"
    )

    print("==============================")

    print(
        f"Candidate flooded area: "
        f"{percentage:.2f}%"
    )

    print(
        "\nFlood mask saved at:"
    )

    print(
        output_path
    )

    print(
        "\nNext step:"
        " validation + paddy classification"
    )