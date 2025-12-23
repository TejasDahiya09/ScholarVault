import { vertexModel } from "../lib/services.js";
import { pipeline } from "@xenova/transformers";
import notesDB from "../db/notes.js";

/**
 * AI/ML Service for text processing and generation
 * All outputs are optimized for student learning
 */
export const aiService = {
  /**
   * Generate summary using Vertex AI (Gemini) - Non-streaming version
   */
  async generateSummary(text) {
    if (!text || text.trim().length === 0) {
      return "No text available for summarization.";
    }

    try {
      if (!vertexModel) {
        throw new Error("Vertex AI not configured. Please add VERTEX_PROJECT to .env file");
      }

      const prompt = `Create a concise study summary.

Rules:
- Plain text only (no bullets/markdown symbols like *, -, #)
- Keep it tight: 3-6 short points
- Use simple language
- Order from most important to supporting details
- End with a one-line takeaway

Content:
${text}

Return format:
Overview: one sentence
Key Points: numbered short lines
Takeaway: one sentence`; 

      const request = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      const response = await vertexModel.generateContent(request);
      const summary = response.response.candidates[0]?.content?.parts[0]?.text;

      return summary || "Unable to generate summary.";
    } catch (err) {
      console.error("Summary generation error:", err.message);
      throw new Error(err.message || "Failed to generate summary");
    }
  },

  /**
   * Ask AI a question about text - Non-streaming version
   */
  async askQuestion(text, question, useRag = false) {
    if (!text || !question) {
      throw new Error("Missing text or question");
    }

    try {
      let prompt;

      if (useRag) {
        prompt = `You are a knowledgeable study tutor answering student questions.

Study Material Context:
${text}

Student Question: ${question}

Answer the question by:
- Using information from the study material
- Adding relevant general knowledge if needed
- Explaining in simple terms
- Being helpful and encouraging
- Providing practical examples if useful

Answer:`;
      } else {
        prompt = `You are a helpful study tutor with broad knowledge.

Student Question: ${question}

Answer this question by:
- Being clear and concise
- Using simple language
- Providing practical examples
- Breaking down complex ideas
- Being encouraging to the student

Answer:`;
      }

      const request = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      const response = await vertexModel.generateContent(request);
      const answer = response.response.candidates[0]?.content?.parts[0]?.text;

      return answer || "Unable to answer question.";
    } catch (err) {
      console.error("Question answering error:", err);
      throw new Error("Failed to answer question");
    }
  },

  /**
   * Generate summary with streaming - OCR content + web knowledge
   * Best for: Comprehensive document summaries
   * Output: Clean, well-structured summary with key points
   */
  async generateSummaryStream(text, res) {
    if (!text || text.trim().length === 0) {
      res.write(`data: ${JSON.stringify({ chunk: "No text available for summarization." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    try {
      const prompt = `Stream a concise study summary in plain text.

Rules (strict):
- Plain text only (no *, -, #, bullets, markdown)
- Short lines; stream as you write
- Prefer numbered key points: 1) 2) 3)
- Include: Overview, Key Points, Takeaway
- Keep it under 120 words total

Content:
${text}

Start with "Overview:" then stream Key Points and Takeaway.`;

      const request = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      const stream = await vertexModel.generateContentStream(request);
      for await (const chunk of stream.stream) {
        const piece = chunk.candidates[0]?.content?.parts[0]?.text || "";
        if (piece) {
          res.write(`data: ${JSON.stringify({ chunk: piece })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      console.error("Summary streaming error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  },

  /**
   * Ask question with streaming - web knowledge enabled
   */
  async askQuestionStream(text, question, useRag = false, res) {
    if (!text || !question) {
      res.write(`data: ${JSON.stringify({ error: "Missing text or question" })}\n\n`);
      res.end();
      return;
    }

    try {
      let prompt;

      if (useRag) {
        prompt = `Provide a crisp, helpful answer using the provided context first.

Rules:
- Plain text only (no bullets/markdown symbols)
- Stream short lines as you think
- Structure:
  Answer: one concise sentence
  Evidence: 2-4 numbered context-backed points
  Tip: one practical next step

Context:
${text}

Question: ${question}

Start now.`;
      } else {
        prompt = `Provide a crisp, helpful answer.

Rules:
- Plain text only (no bullets/markdown symbols)
- Stream short lines as you think
- Structure:
  Answer: one concise sentence
  Key Points: 2-4 numbered supporting points
  Tip: one practical next step

Question: ${question}

Start now.`;
      }

      const request = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      const stream = await vertexModel.generateContentStream(request);
      for await (const chunk of stream.stream) {
        const piece = chunk.candidates[0]?.content?.parts[0]?.text || "";
        if (piece) {
          res.write(`data: ${JSON.stringify({ chunk: piece })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      console.error("Question streaming error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  },
  /**
   * Generate embeddings for semantic search and RAG
   * Used to match student questions with relevant study material
   */
  async generateEmbeddings(texts) {
    try {
      // Use transformers.js for embeddings - converts text to numerical vectors for comparison
      const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      const embeddings = await extractor(texts, {
        pooling: "mean",
        normalize: true,
      });

      return embeddings;
    } catch (err) {
      console.error("Embedding generation error:", err);
      throw new Error("Failed to generate embeddings");
    }
  },

  /**
   * Generate single embedding for a text query
   * Used for search queries
   */
  async generateEmbedding(text) {
    try {
      const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      const result = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      
      // Convert to array format expected by Supabase
      return Array.from(result.data);
    } catch (err) {
      console.error("Embedding generation error:", err);
      return null;
    }
  },

  /**
   * RAG Chat - Answer questions using study material context
   * Best for: Questions where the answer is in the study material
   * Output: Contextual answers with clear references to material
   */
  async ragChat(question, context) {
    if (!question || !context) {
      throw new Error("Missing question or context");
    }

    try {
      const prompt = `You are a study tutor helping a student understand their course material.

Study Material Context:
${context}

Student Question: ${question}

Answer the question by:
- First using information from the study material above
- Being accurate and citing what you found
- Explaining in simple terms
- Adding helpful context if needed
- Being encouraging

Based on the material, answer the question:`;

      const request = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      const response = await vertexModel.generateContent(request);
      const answer = response.response.candidates[0]?.content?.parts[0]?.text;

      return answer || "Unable to answer based on context.";
    } catch (err) {
      console.error("RAG chat error:", err);
      throw new Error("Failed to process RAG query");
    }
  },
};

export default aiService;
