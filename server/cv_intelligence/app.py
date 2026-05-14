import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import base64
import json

app = FastAPI(title="Antigravity AI Interview Intelligence")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

def analyze_frame(image):
    # Convert image to RGB
    img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Gaze Prediction (Placeholder logic based on face orientation)
    face_results = face_mesh.process(img_rgb)
    gaze_score = 100
    integrity_flags = []
    
    if face_results.multi_face_landmarks:
        # Simple heuristic for "looking away"
        # In a full impl, we'd calculate yaw/pitch
        gaze_score = 95
    else:
        gaze_score = 20
        integrity_flags.append("No face detected")

    # Posture/Gesture Analysis
    pose_results = pose.process(img_rgb)
    posture_score = 100
    if pose_results.pose_landmarks:
        # Detect slumping or excessive movement
        posture_score = 90
    else:
        posture_score = 50
        integrity_flags.append("Candidate partially out of frame")

    return {
        "gaze_confidence": gaze_score,
        "posture_score": posture_score,
        "integrity_metrics": {
            "fraud_detection_confidence": 0.98 if not integrity_flags else 0.45,
            "flags": integrity_flags
        },
        "emotion_stability": 0.88 # Placeholder for DeepFace
    }

@app.post("/analyze")
async def analyze(
    applicationId: str = Form(...),
    frame: str = Form(...)
):
    try:
        # Decode base64 image
        header, encoded = frame.split(",", 1)
        data = base64.b64decode(encoded)
        nparr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        results = analyze_frame(img)
        
        return {
            "status": "success",
            "applicationId": applicationId,
            "metrics": results
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/health")
async def health():
    return {"status": "AI Intelligence Service is Online"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
