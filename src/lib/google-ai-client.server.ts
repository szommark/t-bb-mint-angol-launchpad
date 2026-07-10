import { GoogleGenAI } from "@google/genai";

let _google: GoogleGenAI | undefined;

export function getGoogleAiClient(apiKey: string): GoogleGenAI {
  if (!_google) {
    _google = new GoogleGenAI({ apiKey });
  }
  return _google;
}
