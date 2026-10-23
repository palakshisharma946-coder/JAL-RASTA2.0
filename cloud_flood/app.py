import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from dotenv import load_dotenv


# ==========================================
# JALRASTA CLOUD INTELLIGENCE API
# ==========================================

load_dotenv()

app = FastAPI(
    title="JalRasta Cloud Intelligence",
    version="1.0"
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ==========================================
# OUTPUT DIRECTORY
# ==========================================

OUTPUT_DIR = Path("output")

OUTPUT_DIR.mkdir(
    exist_ok=True
)


# Make output files accessible
app.mount(
    "/output",
    StaticFiles(
        directory="output"
    ),
    name="output"
)


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {

        "system":
        "JalRasta Cloud Intelligence",

        "status":
        "online",

        "data":
        "Sentinel-1 SAR",

        "message":
        "Cloud Intelligence API is running."

    }


# ==========================================
# CLOUD INTELLIGENCE RESULT
# ==========================================

@app.get("/api/cloud-intelligence")
def cloud_intelligence():

    flood_map = (
        "/output/flood_map.png"
    )

    flood_mask = (
        "/output/flood_mask.tiff"
    )


    return {

        "system":
        "JalRasta Cloud Intelligence",

        "status":
        "analysis_available",

        "satellite":
        "Sentinel-1",

        "sensor":
        "SAR",

        "analysis":
        "Before vs After SAR change detection",

        "result":
        "Candidate flood areas identified",

        "flood_map":
        flood_map,

        "flood_mask":
        flood_mask,

        "note":
        "Result is a candidate flood detection and requires validation."

    }