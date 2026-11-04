# English to ASL SignWriting model

This service runs the [official Sockeye SignWriting checkpoint](https://huggingface.co/sign/sockeye-text-to-factored-signwriting) using the [SignWriting Translation project](https://github.com/sign-language-processing/signwriting-translation). The checkpoint is licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). The generated notation is a draft and may contain translation errors.

With Docker running, build and start the service from the SignBridge project root.

```sh
docker build -t signbridge-model model
docker run --rm -p 127.0.0.1:8080:7860 signbridge-model
```

For local development without Docker, use Python 3.11 and Git.

```sh
python3.11 -m venv model/.venv
model/.venv/bin/python -m pip install -r model/requirements.txt
OMP_NUM_THREADS=2 model/.venv/bin/python -m uvicorn server:app --app-dir model --host 127.0.0.1 --port 8080
```

The first Python request downloads the approximately 279 MB checkpoint. The Docker build downloads it ahead of time. An existing local copy can be selected with `SIGNWRITING_MODEL_PATH`.

```sh
curl -fsS http://127.0.0.1:8080/ \
  -H 'Content-Type: application/json' \
  --data '{"texts":["I like green apples."],"spoken_language":"en","signed_language":"ase"}'
```

For a live site, deploy the image to an HTTPS container host and configure SignBridge to use its endpoint. Set `SIGNWRITING_MODEL_TOKEN` on the model host if access should require a bearer token.
