async function callHuggingFace(model: string, inputs: unknown) {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    throw new Error("HF_TOKEN is not set");
  }

  const url = `https://router.huggingface.co/hf-inference/models/${model}`;

  for (let i = 0; i < 3; i++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs }),
    });

    if (response.ok) {
      return response.json();
    }

    const text = await response.text();

    // If model is loading or timeout, retry
    if (response.status === 503 || response.status === 504) {
      console.log(`HF model loading... retry ${i + 1}`);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }

    throw new Error(`HF request failed: ${response.status} ${text}`);
  }

  throw new Error("HF request failed after retries");
}

export async function classifyText(model: string, text: string) {
  return callHuggingFace(model, text);
}

export async function summarizeText(text: string) {
  return callHuggingFace("facebook/bart-large-cnn", text);
}

export async function translateToEnglish(text: string) {
  return callHuggingFace("Helsinki-NLP/opus-mt-tc-big-fr-en", text);
}

export async function analyzeSentiment(text: string) {
  return callHuggingFace(
    "cardiffnlp/twitter-roberta-base-sentiment-latest",
    text
  );
}