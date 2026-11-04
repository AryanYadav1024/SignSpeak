"""Serve the public Sockeye English-to-ASL SignWriting checkpoint."""

import os
from functools import cache
from hmac import compare_digest
from threading import Lock
from typing import Annotated, Literal

from fastapi import FastAPI, Header, HTTPException
from huggingface_hub import snapshot_download
from pydantic import BaseModel, Field, StringConstraints
from signwriting_translation.bin import load_sockeye_translator, translate
from signwriting_translation.tokenizer import tokenize_spoken_text

MODEL_REPO = "sign/sockeye-text-to-factored-signwriting"
MODEL_REVISION = "3a45c3bedc0c6ee08fcb3e87b1aaee602dfa06d9"

app = FastAPI(title="SignBridge SignWriting Model")
inference_lock = Lock()
model_token = os.environ.get("SIGNWRITING_MODEL_TOKEN")

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class TranslationRequest(BaseModel):
    texts: list[Text] = Field(min_length=1, max_length=12)
    spoken_language: Literal["en"]
    signed_language: Literal["ase"]


@cache
def download_model() -> str:
    return snapshot_download(
        repo_id=MODEL_REPO,
        revision=MODEL_REVISION,
        allow_patterns=["config", "params.best", "tokenizer.json", "version", "vocab.*.json"],
    )


@app.post("/")
def translate_english(request: TranslationRequest, authorization: Annotated[str | None, Header()] = None):
    if model_token and not compare_digest((authorization or "").encode(), f"Bearer {model_token}".encode()):
        raise HTTPException(401, "Invalid model token.")
    if sum(map(len, request.texts)) > 500:
        raise HTTPException(422, "Use at most 500 characters.")
    inputs = [f"$en $ase {tokenize_spoken_text(text)}" for text in request.texts]
    with inference_lock:
        model_path = os.environ.get("SIGNWRITING_MODEL_PATH") or download_model()
        translator, _ = load_sockeye_translator(model_path)
        outputs = translate(translator, inputs)
    return {"input": request.texts, "output": outputs}
