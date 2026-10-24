"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CreatorNav } from "@/components/creator/CreatorNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  SKILL_TESTS_CATALOG,
  SkillTest,
  recordTestPassedInPassport,
  saveTestSubmission,
  getStoredSkillPassport,
} from "@/lib/skill-passport-store";
import { CREATORS_DATA, Creator } from "@/lib/creators-data";
import { getStoredCreators, getCreatorById } from "@/lib/creators-store";
import { getCurrentUser } from "@/lib/auth";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  Terminal,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
} from "lucide-react";

export default function TestSubmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
          <div className="w-full bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm">Skill Assessment Challenge</span>
          </div>
          <div className="flex-1 max-w-5xl w-full mx-auto p-12 text-center text-xs text-slate-400">
            Loading assessment challenge...
          </div>
        </div>
      }
    >
      <TestSubmissionInner />
    </Suspense>
  );
}

function TestSubmissionInner() {
  const params = useParams();
  const router = useRouter();
  const testId = (params?.id as string) || "prompt-engineering";

  const [creator, setCreator] = useState<Creator>(CREATORS_DATA[0]);
  const [test, setTest] = useState<SkillTest>(
    SKILL_TESTS_CATALOG.find((t) => t.id === testId) || SKILL_TESTS_CATALOG[0]
  );

  // Quiz state: question id -> selected option index
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Practical prompt submission state
  const [userPrompt, setUserPrompt] = useState("");
  const [userParameters, setUserParameters] = useState("--ar 9:16 --v 6.0 --stylize 250");
  const [userWorkflowNotes, setUserWorkflowNotes] = useState("");

  // Timer state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(test.durationMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(true);

  // Submission & Results modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [testResultData, setTestResultData] = useState<{
    score: number;
    passed: boolean;
    quizScore: number;
    promptScore: number;
    certificateId: string;
    feedback: string;
  } | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    const stored = getStoredCreators();
    const matched = user ? getCreatorById(user.id) || stored[0] : stored[0];
    if (matched) {
      setCreator(matched);
    }

    const foundTest =
      SKILL_TESTS_CATALOG.find((t) => t.id === testId) || SKILL_TESTS_CATALOG[0];
    setTest(foundTest);
    setTimeLeftSeconds(foundTest.durationMinutes * 60);

    // Pre-populate realistic sample responses for demo convenience
    if (foundTest.id === "prompt-engineering") {
      setUserPrompt(
        "Cinematic macro studio shot of frosted organic amber skincare bottle, morning dew drops glistening, soft 45-degree diffused daylight with subtle rim highlights, clean minimalist stone pedestal backdrop, ultra-detailed glass refraction, 8k resolution, Hasselblad X2D 100C --ar 9:16 --v 6.0 --stylize 250 --chaos 5"
      );
      setUserWorkflowNotes(
        "1. Initial prompt generation in Midjourney v6 focusing on physical lighting angles. 2. Locked --seed 84920 to calibrate subsurface scattering. 3. Output upscaled 4x with Topaz Photo AI for commercial poster sharpness."
      );
    } else {
      setUserPrompt(foundTest.sampleTargetOutput);
      setUserWorkflowNotes(
        "1. Brief alignment and model parameter selection. 2. Iteration passes with seed locking. 3. Final post-processing and client delivery export."
      );
    }

    // Fetch sanitized test from authoritative server endpoint
    async function fetchSanitizedTest() {
      try {
        const res = await fetch(`/api/v1/tests/${encodeURIComponent(testId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setTest(json.data);
            setTimeLeftSeconds((json.data.durationMinutes || 20) * 60);
          }
        }
      } catch {
        // Fallback to client-sanitized catalog
      }
    }
    fetchSanitizedTest();
  }, [testId]);

  // Countdown timer effect
  useEffect(() => {
    if (!timerRunning || timeLeftSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timeLeftSeconds]);

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);
    setIsSubmitting(true);
    setTimerRunning(false);

    try {
      // 1. Submit answers and practical proofs to authoritative server endpoint
      const res = await fetch("/api/v1/tests/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_id: test.id,
          answers,
          evidence_media_urls: [],
          user_prompt: userPrompt,
          user_workflow_notes: userWorkflowNotes,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || `Server rejected assessment submission (HTTP ${res.status}).`);
      }

      const serverData = json.data;
      const passed = Boolean(serverData.passed ?? (serverData.status === "passed"));
      const finalScore = Number(serverData.score) || 0;
      const certId = serverData.certificateId || `CERT-${test.id.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const result = {
        score: finalScore,
        passed,
        quizScore: serverData.quizScore ?? finalScore,
        promptScore: serverData.promptScore ?? finalScore,
        certificateId: certId,
        feedback: serverData.feedback || (passed ? "Exemplary technical performance!" : "Score below passing threshold."),
      };

      setTestResultData(result);

      // Only record passed certificate in Skill Passport when server confirms passing status
      if (passed) {
        recordTestPassedInPassport(
          creator.id,
          test.associatedSkill,
          {
            testId: test.id,
            testName: test.title,
            score: finalScore,
            maxScore: 100,
            passed: true,
            takenAt: new Date().toISOString().split("T")[0],
            certificateId: certId,
            benchmarkAccuracy: `${finalScore}% Parameter Precision`,
          },
          finalScore
        );
      }

      // Save test submission record to local cache
      saveTestSubmission({
        id: serverData.id || `sub-${Date.now()}`,
        testId: test.id,
        creatorId: creator.id,
        score: finalScore,
        passed,
        submittedAt: new Date().toISOString(),
        quizScore: serverData.quizScore ?? finalScore,
        promptScore: serverData.promptScore ?? finalScore,
        feedback: result.feedback,
        certificateId: certId,
        userPrompt,
        userParameters,
        userWorkflowNotes,
      });

      setResultsModalOpen(true);
    } catch (err: any) {
      console.error("Test submission error:", err);
      setSubmissionError(err?.message || "Failed to submit assessment to server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <CreatorNav />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/creator/tests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Tests</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Test In Progress:</span>
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1 rounded-full border ${
                timeLeftSeconds < 180
                  ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </span>
          </div>
        </div>

        {/* Test Meta Header Card */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="purple" size="sm">
                  {test.category}
                </Badge>
                <Badge variant="outline" size="sm">
                  Passing Score: {test.passingScore}%
                </Badge>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {test.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {test.description}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Upgrades Skill:
              </span>
              <span className="text-sm font-black text-indigo-700 block">
                {test.associatedSkill}
              </span>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Test Verified Badge
              </span>
            </div>
          </div>
        </section>

        {/* Test Form */}
        <form onSubmit={handleSubmitTest} className="space-y-8">
          {/* Section 1: Multiple-Choice Technical Quiz */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span>Section 1: Technical Benchmark Quiz ({test.questions.length} Questions)</span>
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {Object.keys(answers).length} of {test.questions.length} answered
              </span>
            </div>

            <div className="space-y-4">
              {test.questions.map((q, idx) => (
                <Card key={q.id} className="border-slate-200/90">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Question {idx + 1}: {q.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2.5">
                    {q.options.map((option, optIdx) => {
                      const isSelected = answers[q.id] === optIdx;
                      return (
                        <label
                          key={optIdx}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer text-xs ${
                            isSelected
                              ? "bg-blue-50/70 border-blue-500 font-semibold text-blue-950"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            checked={isSelected}
                            onChange={() => handleSelectOption(q.id, optIdx)}
                            className="mt-0.5 text-blue-600"
                          />
                          <span className="flex-1">{option}</span>
                        </label>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Section 2: Practical Prompt Challenge */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span>Section 2: Practical Creative Prompt Challenge</span>
            </h2>

            <Card className="border-indigo-200/80 bg-gradient-to-b from-indigo-50/30 to-white">
              <CardHeader className="pb-3 border-b border-indigo-100">
                <Badge variant="purple" size="sm" className="w-fit">
                  Client Scenario Brief
                </Badge>
                <CardTitle className="text-base mt-2 text-slate-900">
                  {test.briefScenario}
                </CardTitle>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Task Requirement:</strong> {test.briefPromptInstructions}
                </p>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Your Generation Prompt *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="Write your exact production-ready prompt..."
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-300 font-mono text-slate-800 focus:outline-blue-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Model Flags & Parameters
                    </label>
                    <input
                      type="text"
                      value={userParameters}
                      onChange={(e) => setUserParameters(e.target.value)}
                      placeholder="e.g. --ar 9:16 --v 6.0 --stylize 250"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Target AI Tools
                    </label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {test.aiToolsCovered.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Workflow & Optimization Reasoning
                  </label>
                  <textarea
                    rows={3}
                    value={userWorkflowNotes}
                    onChange={(e) => setUserWorkflowNotes(e.target.value)}
                    placeholder="Describe your reasoning: camera choice, lighting physics, how you prevent hallucinations..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-blue-500"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submission Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Auto-grading engine calculates parameter precision upon submission.
              </span>
            </div>

            {submissionError && (
              <div className="w-full p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{submissionError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link href="/creator/tests">
                <Button type="button" variant="outline" size="md">
                  Exit Test
                </Button>
              </Link>
              <Button
                type="submit"
                variant="gradient"
                size="md"
                isLoading={isSubmitting}
                className="gap-2 shadow-lg shadow-blue-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Submit Assessment</span>
              </Button>
            </div>
          </div>
        </form>
      </main>

      {/* Results & Celebration Modal */}
      {testResultData && (
        <Modal
          isOpen={resultsModalOpen}
          onClose={() => setResultsModalOpen(false)}
          title={testResultData.passed ? "Assessment Passed!" : "Assessment Complete"}
          description={test.title}
          maxWidth="lg"
        >
          <div className="space-y-6 text-center py-2">
            {testResultData.passed ? (
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce-slow">
                <Award className="w-9 h-9" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-9 h-9" />
              </div>
            )}

            <div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-slate-900">
                  {testResultData.score}%
                </span>
                <span className="text-sm font-bold text-slate-400">/ 100</span>
              </div>
              <p
                className={`text-xs font-bold uppercase tracking-wider mt-1 ${
                  testResultData.passed ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {testResultData.passed ? "Test Verified Benchmark Earned" : "Needs Retake"}
              </p>
            </div>

            {/* Score Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Technical Quiz
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  {testResultData.quizScore}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Prompt Precision
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  {testResultData.promptScore}%
                </span>
              </div>
            </div>

            {/* Feedback & Certificate info */}
            <p className="text-xs text-slate-600 leading-relaxed text-left bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {testResultData.feedback}
            </p>

            {testResultData.passed && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-xs text-blue-900 font-mono flex items-center justify-between">
                <span>Certificate Hash:</span>
                <span className="font-bold">{testResultData.certificateId}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/creator/passport" className="flex-1">
                <Button variant="gradient" size="md" className="w-full justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>View in Skill Passport</span>
                </Button>
              </Link>
              <Link href="/creator/tests" className="flex-1">
                <Button variant="outline" size="md" className="w-full justify-center">
                  All Tests
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
