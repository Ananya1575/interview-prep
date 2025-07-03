import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/Inputs/Input";
import SpinnerLoader from "../../components/Loader/SpinnerLoader";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { FaFileUpload, FaArrowLeft, FaCheckCircle } from "react-icons/fa";

// Placeholder for the new component
const ResumeBasedQuestionForm = ({ onBack }) => {
  const [file, setFile] = useState(null);
  const [experience, setExperience] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !experience || !jobTitle) {
      setError("Please fill all the required fields and upload a file.");
      return;
    }
    setError("");
    setIsLoading(true);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("experience", experience);
      formData.append("jobTitle", jobTitle);
      const response = await axiosInstance.post(
        API_PATHS.AI.GENERATE_QUESTIONS_FROM_RESUME,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const generatedQuestions = response.data;
      // Automatically create a session with the generated questions
      const sessionPayload = {
        role: jobTitle,
        experience,
        topicsToFocus: "Resume/Job Description Based",
        description: "Generated from resume/job description",
        questions: generatedQuestions,
      };
      const sessionRes = await axiosInstance.post(API_PATHS.SESSION.CREATE, sessionPayload);
      setSuccess(true);
      if (sessionRes.data?.session?._id) {
        setTimeout(() => {
          navigate(`/interview-prep/${sessionRes.data?.session?._id}`);
        }, 1200);
      }
    } catch (error) {
      setError("Failed to generate questions or save session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[90vw] md:w-[35vw] flex flex-col items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-7 w-full max-w-lg">
        <button
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs mb-4"
          onClick={onBack}
          type="button"
          aria-label="Back to Standard Form"
        >
          <FaArrowLeft className="inline-block" /> Back to Standard Form
        </button>
        <h3 className="text-xl font-bold text-black mb-1">
          Generate Questions from Resume/Job Description
        </h3>
        <p className="text-xs text-slate-600 mb-4">
          Upload your resume or a job description, enter your experience and job title, and get personalized interview questions!
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Resume-based question generation form">
          <label className="text-sm font-medium" htmlFor="resume-upload">
            Upload Resume/Job Description (PDF, DOCX, or TXT)
          </label>
          <div className="flex items-center gap-3">
            <label htmlFor="resume-upload" className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
              <FaFileUpload className="text-blue-500" />
              <span className="text-xs font-medium text-blue-700">Choose File</span>
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                aria-required="true"
              />
            </label>
            {file && <span className="text-xs text-gray-700 truncate max-w-[150px]">{file.name}</span>}
          </div>
          <Input
            value={experience}
            onChange={({ target }) => setExperience(target.value)}
            label="Years of Experience"
            placeholder="(e.g., 1 year, 3 years, 5+ years)"
            type="number"
            aria-required="true"
          />
          <Input
            value={jobTitle}
            onChange={({ target }) => setJobTitle(target.value)}
            label="Job Title"
            placeholder="(e.g., Frontend Developer)"
            type="text"
            aria-required="true"
          />
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 rounded px-3 py-2 text-xs flex items-center gap-2">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-300 text-green-700 rounded px-3 py-2 text-xs flex items-center gap-2">
              <FaCheckCircle className="text-green-500" />
              Session created! Redirecting...
            </div>
          )}
          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold py-2.5 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading && <SpinnerLoader />}
            <FaFileUpload /> Generate & Save Session
          </button>
        </form>
        {isLoading && (
          <div className="flex justify-center items-center mt-4">
            <SpinnerLoader />
          </div>
        )}
      </div>
    </div>
  );
};

const CreateSessionForm = () => {
  const [formData, setFormData] = useState({
    role: "",
    experience: "",
    topicsToFocus: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useResumeMode, setUseResumeMode] = useState(false);
  const navigate = useNavigate();

  const handleChange = (key, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [key]: value,
    }));
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    const { role, experience, topicsToFocus } = formData;
    if (!role || !experience || !topicsToFocus) {
      setError("Please fill all the required fields.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      // Call AI API to generate questions
      const aiResponse = await axiosInstance.post(
        API_PATHS.AI.GENERATE_QUESTIONS,
        {
          role,
          experience,
          topicsToFocus,
          numberOfQuestions: 10,
        }
      );
      // Should be array like [{question, answer}, ...]
      const generatedQuestions = aiResponse.data;
      const response = await axiosInstance.post(API_PATHS.SESSION.CREATE, {
        ...formData,
        questions: generatedQuestions,
      });
      if (response.data?.session?._id) {
        navigate(`/interview-prep/${response.data?.session?._id}`);
      }
    } catch (error) {
      if (error.response && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle UI
  if (useResumeMode) {
    return <ResumeBasedQuestionForm onBack={() => setUseResumeMode(false)} />;
  }

  return (
    <div className="w-[90vw] md:w-[35vw] p-7 flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs">Standard</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={useResumeMode}
            onChange={() => setUseResumeMode((v) => !v)}
          />
          <span className="slider round"></span>
        </label>
        <span className="text-xs">Resume/Job Description</span>
      </div>
      <h3 className="text-lg font-semibold text-black">
        Start a New Interview Journey
      </h3>
      <p className="text-xs text-slate-700 mt-[5px] mb-3">
        Fill out a few quick details and unlock your personalized set of
        interview questions!
      </p>
      <form onSubmit={handleCreateSession} className="flex flex-col gap-3">
        <Input
          value={formData.role}
          onChange={({ target }) => handleChange("role", target.value)}
          label="Target Role"
          placeholder="(e.g., Frontend Developer, UI/UX Designer, etc.)"
          type="text"
        />
        <Input
          value={formData.experience}
          onChange={({ target }) => handleChange("experience", target.value)}
          label="Years of Experience"
          placeholder="(e.g., 1 year, 3 years, 5+ years)"
          type="number"
        />
        <Input
          value={formData.topicsToFocus}
          onChange={({ target }) => handleChange("topicsToFocus", target.value)}
          label="Topics to Focus On"
          placeholder="(Comma-separated, e.g., React, Node.js, MongoDB)"
          type="text"
        />
        <Input
          value={formData.description}
          onChange={({ target }) => handleChange("description", target.value)}
          label="Description"
          placeholder="(Any specific goals or notes for this session)"
          type="text"
        />
        {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
        <button
          type="submit"
          className="btn-primary w-full mt-2"
          disabled={isLoading}
        >
          {isLoading && <SpinnerLoader />} Create Session
        </button>
      </form>
    </div>
  );
};

export default CreateSessionForm;
