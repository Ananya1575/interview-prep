const { GoogleGenAI } = require("@google/genai");
const {
  conceptExplainPrompt,
  questionAnswerPrompt,
  resumeBasedQuestionPrompt,
} = require("../utils/prompts");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// @desc    Generate interview questions and answers using Gemini
// @route   POST /api/ai/generate-questions
// @access  Private
const generateInterviewQuestions = async (req, res) => {
  try {
    const { role, experience, topicsToFocus, numberOfQuestions } = req.body;

    if (!role || !experience || !topicsToFocus || !numberOfQuestions) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = questionAnswerPrompt(
      role,
      experience,
      topicsToFocus,
      numberOfQuestions
    );

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: prompt,
    });

    let rawText = response.text;

    // Clean it: Remove ```json and ``` from beginning and end
    const cleanedText = rawText
      .replace(/^```json\s*/, "") // remove starting ```json
      .replace(/```$/, "") // remove ending ```
      .trim(); // remove extra spaces

    // Now safe to parse
    const data = JSON.parse(cleanedText);

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};

// @desc    Generate explains a interview question
// @route   POST /api/ai/generate-explanation
// @access  Private
const generateConceptExplanation = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = conceptExplainPrompt(question);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: prompt,
    });

    let rawText = response.text;

    // Clean it: Remove ```json and ``` from beginning and end
    const cleanedText = rawText
      .replace(/^```json\s*/, "") // remove starting ```json
      .replace(/```$/, "") // remove ending ```
      .trim(); // remove extra spaces

    // Now safe to parse
    const data = JSON.parse(cleanedText);

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};

// @desc    Generate interview questions from resume/job description using Gemini
// @route   POST /api/ai/generate-questions-from-resume
// @access  Private
const generateQuestionsFromResume = async (req, res) => {
  try {
    const { experience, jobTitle } = req.body;
    const numberOfQuestions = 10;
    if (!req.file || !experience || !jobTitle) {
      return res.status(400).json({ message: "Missing required fields or file" });
    }
    const ext = (req.file.originalname || '').split('.').pop().toLowerCase();
    let resumeText = "";

    if (ext === "pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      resumeText = pdfData.text;
    } else if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      resumeText = result.value;
    } else if (ext === "txt") {
      resumeText = req.file.buffer.toString("utf-8");
    } else {
      return res.status(400).json({ message: "Unsupported file type" });
    }

    // Limit resumeText length for prompt safety
    resumeText = resumeText.slice(0, 3000);
    const prompt = resumeBasedQuestionPrompt(resumeText, experience, jobTitle, numberOfQuestions);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: prompt,
    });
    let rawText = response.text;
    // Remove all code block markers (```json, ```) from anywhere in the string
    let cleanedText = rawText.replace(/```json|```/gi, "").trim();
    try {
      const data = JSON.parse(cleanedText);
      res.status(200).json(data);
    } catch (err) {
      console.error('Failed to parse Gemini response:', cleanedText);
      res.status(500).json({
        message: "Gemini AI returned invalid JSON.",
        error: err.message,
        raw: cleanedText
      });
    }
  } catch (error) {
    console.error('Error in generateQuestionsFromResume:', error);
    res.status(500).json({
      message: "Failed to generate questions from resume",
      error: error.message,
      stack: error.stack,
    });
  }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation, generateQuestionsFromResume };
