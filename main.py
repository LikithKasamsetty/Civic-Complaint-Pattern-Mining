from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
import os
import shutil
import sys

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_FILE= os.path.join(BASE_DIR, "outputs", "results.json")


@app.post("/api/run")
async def run_pipeline(file: UploadFile = File(None)):
    csv_path = None

    # Save uploaded file if provided
    if file and file.filename:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        csv_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(csv_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        print(f"File saved: {csv_path}", flush=True)

    async def event_generator():
        # Run pipeline.py as subprocess
        script = os.path.join(BASE_DIR, "pipeline.py")
        args   = [sys.executable, script]
        if csv_path:
            args.append(csv_path)

        print(f"Running: {args}", flush=True)

        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=BASE_DIR,
            limit=1024 * 1024 * 10, # 10 MB
            env={**os.environ, "PYTHONIOENCODING": "utf-8"}
        )

        full_output = []

        while True:
            line = await process.stdout.readline()
            if not line:
                break
            
            try:
                decoded_line = line.decode("utf-8").strip()
            except UnicodeDecodeError:
                decoded_line = line.decode("ascii", "replace").strip()
                
            full_output.append(decoded_line)

            if decoded_line.startswith("DONE:"):
                # Send the final data
                yield f"data: {decoded_line[5:]}\n\n"
            elif decoded_line:
                # Send log as JSON
                yield f"data: {json.dumps({'log': decoded_line})}\n\n"

        await process.wait()
        
        if process.returncode != 0:
            error_msg = json.dumps({"error": "Pipeline failed", "stderr": "\\n".join(full_output[-20:])})
            yield f"data: {error_msg}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/results")
def get_results():
    if not os.path.exists(OUTPUT_FILE):
        return {"error": "No results yet. Run pipeline first."}
    with open(OUTPUT_FILE) as f:
        return json.load(f)

@app.get("/")
def root():
    return {"status": "Backend is running!"}