# SignBridge

SignBridge shows Sutton SignWriting and recorded ASL Signbank clips for dictionary matches. For other inputs, it can use an experimental English-to-ASL model to generate written signs. The app exports dictionary notation as SVG and generated notation as Formal SignWriting (`.fsw`). Generated results can contain ASL errors and have no signer clip.

## Run locally

Use Node.js 22.12 or newer. Run these commands from the project folder.

```sh
npm ci
npm run dev
```

Open the printed local URL in desktop Chrome for the microphone demo. Exact phrases and a few aliases work with the local dictionary. To enable Gemini, copy `.env.example` to `.env`, fill in `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey), and restart Vite. The key stays on the server.

Gemini matches the intent of the whole input to a supported entry. With Simplify Text enabled, the interface also shows the short label alongside the original. Microphone recognition may use your browser's online speech service. With Gemini configured, pressing Translate sends the reviewed text to Google through the server function.

For sentence generation, start the model service on port 8080 in a separate terminal using the [model setup instructions](model/README.md). Try **“Hello world.”** SignBridge sends unmatched text to the inference service and sends the returned notation tokens to SignPuddle for rendering.

## Deploy to Netlify

Run the following commands in the project folder and authorize the CLI in your browser. If prompted, create a new site under your Netlify team.

```sh
npx netlify-cli login
npx netlify-cli deploy --prod
```

In the new site's Netlify dashboard, add `GEMINI_API_KEY` under **Project configuration → Environment variables**. Include the **Functions** scope if shown. Redeploy with the same deploy command. The CLI uses `netlify.toml` to build the frontend and deploy the function. [Netlify CLI guide](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/)

Host the Python model service separately and set `SIGNWRITING_MODEL_URL` to its full HTTPS inference URL in the Netlify production environment. If the inference service requires bearer authentication, set `SIGNWRITING_MODEL_TOKEN` there as well. Redeploy to apply the variables. Vite uses `http://127.0.0.1:8080/` for local inference by default.

Open the resulting HTTPS URL in desktop Chrome and test microphone permission, Gemini, playback, SVG download, and spoken confirmation.

## Three-minute demo

1. Explain that SignBridge pairs an ASL sign clip with its written notation.
2. Click **Record Voice**, say **“Thank you”**, review the transcript, and press **Translate**. Use the example button if microphone recognition fails.
3. Show the **Gemini match** badge if Gemini is configured. For an AI-only intent example, try **“I appreciate it.”** The dictionary fallback is labeled separately.
4. Play the signer clip, download the notation SVG, and use the speaker icon to replay the spoken confirmation.
5. With the model running, translate **“Hello world.”** Show the experimental written result and download its `.fsw` file.

Asset attribution and terms are in [credits.txt](public/credits.txt). The signing videos are supplied under a noncommercial license.
