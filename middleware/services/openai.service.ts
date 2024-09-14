import { OpenAI } from "openai";
import logger from "../logger";
import * as dotenv from "dotenv";
dotenv.config();
const openAiKey = process.env.OPENAI_KEY;

const openai = new OpenAI({
  apiKey: openAiKey,
});

export async function completion(query: string) {
  try {
    logger.info("Getting completion from OpenAI API ");
    logger.info("Query: ", query);
    const chatCompletion = await openai.chat.completions.create({
      model: process.env.MODEL_NAME || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `${query}`,
        },
      ],
      max_tokens: 1000,
      temperature: 1,
    });

    logger.info("Got completion from OpenAI API");
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    logger.error("Failed to get completion from OpenAI API", error);
    throw new Error("Failed to get completion from OpenAI API");
  }
}
