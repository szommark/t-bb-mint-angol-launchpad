import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | undefined;

export function getAnthropicClient(apiKey: string): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}
