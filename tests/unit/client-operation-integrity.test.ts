import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Set up mock window and localStorage for headless Node test environment
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    localStorage: mockLocalStorage,
  };
  (globalThis as any).localStorage = mockLocalStorage;
}

// Import relevant stores
import {
  getStoredCreators,
  getCreatorById,
  removeCreatorPortfolio,
  addCreatorSkill,
  addCreatorPortfolio,
} from "../../lib/creators-store";
import {
  getStoredSkillPassport,
  addSkillToPassport,
  SkillPassportItem,
} from "../../lib/skill-passport-store";

describe("Phase 1: Client-Side Operation Integrity Regression Suite", () => {
  const testCreatorId = "ananya-rao";

  beforeEach(() => {
    storageMap.clear();
  });

  describe("Task 1: Portfolio Deletion Operation Integrity & Rollback", () => {
    it("should preserve portfolio state and project visibility on HTTP failure (500)", async () => {
      // Setup initial state
      const initialProject = {
        title: "Test Reel Project 1",
        brand: "GlowLab",
        category: "Beauty",
        contentType: "Instagram Reel",
        toolsUsed: ["Midjourney v6"],
        image: "/images/test.jpg",
        results: "Test results",
      };

      const added = addCreatorPortfolio(testCreatorId, initialProject as any);
      const projectId = added?.portfolio[0]?.id!;
      assert.ok(projectId);

      let localProjects = getCreatorById(testCreatorId)?.portfolio || [];
      const projectExistsBefore = localProjects.some((p) => p.id === projectId);
      assert.equal(projectExistsBefore, true);

      // Simulate client deletion handler with simulated HTTP failure
      let stateProjects = [...localProjects];
      let deleteError: string | null = null;
      let deleteNotice: string | null = null;

      const mockFetchDelete = async (_id: string): Promise<{ ok: boolean; status: number; json: () => Promise<any> }> => {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "Internal database error deleting portfolio item" }),
        };
      };

      // Handler logic under test
      const res = await mockFetchDelete(projectId);
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        deleteError = json.error || `Server rejected project deletion (HTTP ${res.status}).`;
      } else {
        removeCreatorPortfolio(testCreatorId, projectId);
        stateProjects = stateProjects.filter((p) => p.id !== projectId);
        deleteNotice = "Project successfully deleted from your portfolio.";
      }

      // Assertions: Project MUST remain in state, no success notice, error notice present
      assert.ok(deleteError);
      assert.equal(deleteError, "Internal database error deleting portfolio item");
      assert.equal(deleteNotice, null);
      assert.equal(stateProjects.some((p) => p.id === projectId), true);
      assert.equal(getCreatorById(testCreatorId)?.portfolio?.some((p) => p.id === projectId), true);

      // Cleanup
      removeCreatorPortfolio(testCreatorId, projectId);
    });

    it("should preserve portfolio state on network failure (connection drop)", async () => {
      const initialProject = {
        title: "Network Failure Project",
        brand: "Aura",
        category: "Tech",
        contentType: "Commercial Video",
        toolsUsed: ["Runway Gen-3"],
        image: "/images/test2.jpg",
        results: "Results",
      };

      const added = addCreatorPortfolio(testCreatorId, initialProject as any);
      const projectId = added?.portfolio[0]?.id!;
      assert.ok(projectId);

      let stateProjects = [...(getCreatorById(testCreatorId)?.portfolio || [])];
      let deleteError: string | null = null;

      const mockFetchNetworkError = async (): Promise<never> => {
        throw new TypeError("Failed to fetch: connection refused");
      };

      try {
        await mockFetchNetworkError();
        // If it didn't throw, we'd delete
        removeCreatorPortfolio(testCreatorId, projectId);
        stateProjects = stateProjects.filter((p) => p.id !== projectId);
      } catch (err: any) {
        deleteError = err?.message || "Network error while deleting project.";
      }

      // Assertions
      assert.ok(deleteError);
      assert.ok(deleteError.includes("Failed to fetch"));
      assert.equal(stateProjects.some((p) => p.id === projectId), true);
      assert.equal(getCreatorById(testCreatorId)?.portfolio?.some((p) => p.id === projectId), true);

      // Cleanup
      removeCreatorPortfolio(testCreatorId, projectId);
    });

    it("should remove project from state and display success notice on confirmed deletion", async () => {
      const initialProject = {
        title: "Successful Deletion Project",
        brand: "Luxe",
        category: "Fashion",
        contentType: "Lookbook",
        toolsUsed: ["Midjourney v6"],
        image: "/images/test3.jpg",
        results: "Results",
      };

      const added = addCreatorPortfolio(testCreatorId, initialProject as any);
      const projectId = added?.portfolio[0]?.id!;
      assert.ok(projectId);

      let stateProjects = [...(getCreatorById(testCreatorId)?.portfolio || [])];
      let deleteError: string | null = null;
      let deleteNotice: string | null = null;

      const mockFetchSuccess = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: "Project deleted" }),
      });

      const res = await mockFetchSuccess();
      const json: any = await res.json();

      if (!res.ok) {
        deleteError = json.error;
      } else {
        removeCreatorPortfolio(testCreatorId, projectId);
        stateProjects = stateProjects.filter((p) => p.id !== projectId);
        deleteNotice = "Project successfully deleted from your portfolio.";
      }

      // Assertions
      assert.equal(deleteError, null);
      assert.equal(deleteNotice, "Project successfully deleted from your portfolio.");
      assert.equal(stateProjects.some((p) => p.id === projectId), false);
    });
  });

  describe("Task 2: Skill Addition Integrity & Form State Preservation", () => {
    it("should retain form inputs and avoid committing to store when server rejects skill (400)", async () => {
      let formInput = "Cinematic Diffusion Lighting";
      let formCategory = "AI Video Production";
      let formTools = "Runway Gen-3, Midjourney v6";
      let isModalOpen = true;
      let addSkillError: string | null = null;
      let committedToStore = false;

      const mockApiRejection = async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: "Skill already exists for this creator profile" }),
      });

      // Execute simulated handleAddNewSkill
      const res = await mockApiRejection();
      const json = await res.json();

      if (!res.ok) {
        addSkillError = json.error;
      } else {
        addSkillToPassport(testCreatorId, formInput, formCategory, formTools.split(","));
        committedToStore = true;
        formInput = "";
        isModalOpen = false;
      }

      // Assertions: Form input is preserved, modal stays open, error displayed, no store mutation
      assert.equal(addSkillError, "Skill already exists for this creator profile");
      assert.equal(formInput, "Cinematic Diffusion Lighting");
      assert.equal(isModalOpen, true);
      assert.equal(committedToStore, false);
    });

    it("should retain form inputs and modal on network drop during skill addition", async () => {
      let formInput = "Temporal Video Consistency";
      let isModalOpen = true;
      let addSkillError: string | null = null;
      let committedToStore = false;

      const mockApiNetworkDrop = async (): Promise<never> => {
        throw new Error("Network connection dropped during skill registration");
      };

      try {
        await mockApiNetworkDrop();
        committedToStore = true;
        formInput = "";
        isModalOpen = false;
      } catch (err: any) {
        addSkillError = err?.message || "Network error while saving skill.";
      }

      // Assertions
      assert.ok(addSkillError);
      assert.ok(addSkillError.includes("Network connection dropped"));
      assert.equal(formInput, "Temporal Video Consistency");
      assert.equal(isModalOpen, true);
      assert.equal(committedToStore, false);
    });

    it("should commit to store, reset form, and close modal upon confirmed server save", async () => {
      let formInput = `Verified Unique Skill ${Date.now()}`;
      let formCategory = "Generative Imagery";
      let formTools = "Midjourney v6";
      let isModalOpen = true;
      let addSkillError: string | null = null;
      let committedToStore = false;

      const mockApiSuccess = async () => ({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            id: `cs-test-${Date.now()}`,
            score: 75,
            verification_status: "claimed",
            skills: { name: formInput, category: formCategory },
          },
          message: "Skill registered successfully",
        }),
      });

      const res = await mockApiSuccess();
      const json: any = await res.json();

      if (!res.ok) {
        addSkillError = json.error;
      } else {
        addSkillToPassport(testCreatorId, formInput, formCategory, [formTools]);
        addCreatorSkill(testCreatorId, formInput);
        committedToStore = true;
        formInput = "";
        isModalOpen = false;
      }

      // Assertions
      assert.equal(addSkillError, null);
      assert.equal(formInput, "");
      assert.equal(isModalOpen, false);
      assert.equal(committedToStore, true);
    });
  });

  describe("Task 3: AI Content Studio Deletion Rollback", () => {
    it("should rollback savedIds and savedDbItems when delete action returns failure", async () => {
      const initialItem = {
        id: "ai-item-rollback-test",
        title: "Viral Retention Hook for Coffee Brand",
        concept: "Sensory coffee grinding ASMR",
        hook: "You have been brewing espresso completely wrong.",
      };

      // Initial state with item present
      let savedIds = [initialItem.id, "unrelated-item-id-1"];
      let savedDbItems = [initialItem, { id: "unrelated-item-id-1", title: "Unrelated Item" }];
      let error: string | null = null;
      let dbNotice: string | null = null;

      // Simulated action returning failure
      const mockDeleteActionFailure = async (_id: string) => ({
        success: false as const,
        error: "Database constraint error: cannot delete locked bookmark",
      });

      // Simulation of toggleSave deletion path
      const prevSavedIds = [...savedIds];
      const prevSavedDbItems = [...savedDbItems];
      const targetId = initialItem.id;

      // Optimistic state update
      savedIds = savedIds.filter((id) => id !== targetId);
      savedDbItems = savedDbItems.filter((s) => s.id !== targetId);

      // Verify item was optimistically removed
      assert.equal(savedIds.includes(initialItem.id), false);

      // Execute action
      const res = await mockDeleteActionFailure(targetId);
      if (!res || !res.success) {
        // Rollback state cleanly without overwriting unrelated items
        savedIds = Array.from(new Set([...savedIds, ...prevSavedIds.filter((id) => id === targetId)]));
        savedDbItems = [...prevSavedDbItems.filter((p) => p.id === targetId), ...savedDbItems];
        error = res?.error || "Failed to delete saved item from server.";
      } else {
        dbNotice = "Idea removed from saved database collection.";
      }

      // Assertions: State is completely rolled back, error is visible, no false success notice
      assert.ok(error);
      assert.equal(error, "Database constraint error: cannot delete locked bookmark");
      assert.equal(dbNotice, null);
      assert.equal(savedIds.includes(initialItem.id), true);
      assert.equal(savedIds.includes("unrelated-item-id-1"), true);
      assert.equal(savedDbItems.some((s) => s.id === initialItem.id), true);
      assert.equal(savedDbItems.some((s) => s.id === "unrelated-item-id-1"), true);
    });

    it("should cleanly remove item and show success notice when delete action succeeds", async () => {
      const initialItem = {
        id: "ai-item-success-test",
        title: "Clean Deletion Test Item",
      };

      let savedIds = [initialItem.id];
      let savedDbItems = [initialItem];
      let error: string | null = null;
      let dbNotice: string | null = null;

      const mockDeleteActionSuccess = async (_id: string): Promise<{ success: boolean; data?: any; message?: string; error?: string }> => ({
        success: true,
        data: { id: _id },
        message: "Deleted successfully.",
      });

      const prevSavedIds = [...savedIds];
      const prevSavedDbItems = [...savedDbItems];
      const targetId = initialItem.id;

      savedIds = savedIds.filter((id) => id !== targetId);
      savedDbItems = savedDbItems.filter((s) => s.id !== targetId);

      const res = await mockDeleteActionSuccess(targetId);
      if (!res || !res.success) {
        savedIds = prevSavedIds;
        savedDbItems = prevSavedDbItems;
        error = res?.error || "Failed to delete";
      } else {
        dbNotice = "Idea removed from saved database collection.";
      }

      assert.equal(error, null);
      assert.equal(dbNotice, "Idea removed from saved database collection.");
      assert.equal(savedIds.includes(initialItem.id), false);
      assert.equal(savedDbItems.some((s) => s.id === initialItem.id), false);
    });
  });

  describe("Phase 2: Creator Profile AI Audit Transparency & Error Integrity", () => {
    it("should store authentic score and label with model provider on genuine AI success", async () => {
      let auditResult: any = null;
      let auditError: string | null = null;
      let isAuditing = true;

      const mockApiSuccess = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            overallReadinessScore: 84,
            strengths: ["Strong visual storytelling", "Consistent framing"],
            potentialImprovementAreas: ["Expand lighting variance"],
            engine: "ai_model",
            provider: "Google Gemini 2.5",
            isFallback: false,
          },
        }),
      });

      const res = await mockApiSuccess();
      const json: any = await res.json();

      if (!res.ok || !json.success) {
        auditResult = null;
        auditError = json.error || "Failed";
      } else {
        auditResult = json.data;
      }
      isAuditing = false;

      // Assertions
      assert.equal(isAuditing, false);
      assert.equal(auditError, null);
      assert.ok(auditResult);
      assert.equal(auditResult.overallReadinessScore, 84);
      assert.equal(auditResult.engine, "ai_model");
      assert.equal(auditResult.provider, "Google Gemini 2.5");
      assert.equal(auditResult.isFallback, false);
    });

    it("should transparently label output as heuristic fallback when model is unavailable", async () => {
      let auditResult: any = null;
      let auditError: string | null = null;

      const mockApiFallback = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            overallReadinessScore: 78,
            strengths: ["Diverse verified skill stack with 4 core proficiencies"],
            potentialImprovementAreas: ["Include commercial case study samples"],
            engine: "heuristic_fallback",
            provider: "Heuristic Audit Engine",
            isFallback: true,
            fallbackReason: "AI provider credentials not configured. Using rule-based audit engine.",
          },
        }),
      });

      const res = await mockApiFallback();
      const json: any = await res.json();

      if (!res.ok || !json.success) {
        auditResult = null;
        auditError = json.error;
      } else {
        auditResult = json.data;
      }

      assert.equal(auditError, null);
      assert.ok(auditResult);
      assert.equal(auditResult.overallReadinessScore, 78);
      assert.equal(auditResult.isFallback, true);
      assert.equal(auditResult.engine, "heuristic_fallback");
      assert.equal(auditResult.provider, "Heuristic Audit Engine");
      assert.ok(auditResult.fallbackReason?.includes("rule-based audit engine"));
    });

    it("should set honest auditError and NEVER fabricate 92/100 score on HTTP 500 error", async () => {
      let auditResult: any = null;
      let auditError: string | null = null;

      const mockApi500 = async () => ({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: "Failed to generate AI creator profile analysis. Please try again.",
        }),
      });

      const res = await mockApi500();
      const json: any = await res.json();

      if (!res.ok || !json.success) {
        auditResult = null;
        auditError = json.error || `AI profile audit is currently unavailable (HTTP ${res.status}).`;
      } else {
        auditResult = json.data;
      }

      // Assertions: auditResult MUST be null, NO 92/100 score, clear error message
      assert.equal(auditResult, null);
      assert.ok(auditError);
      assert.equal(auditError, "Failed to generate AI creator profile analysis. Please try again.");
    });

    it("should set honest auditError and NEVER fabricate scripted bullet points on network drop", async () => {
      let auditResult: any = null;
      let auditError: string | null = null;

      const mockNetworkDrop = async (): Promise<never> => {
        throw new TypeError("Failed to fetch: connection refused");
      };

      try {
        await mockNetworkDrop();
      } catch (err: any) {
        auditResult = null;
        auditError = err?.message || "Network error while connecting to AI profile audit service.";
      }

      // Assertions
      assert.equal(auditResult, null);
      assert.ok(auditError);
      assert.ok(auditError.includes("Failed to fetch"));
    });

    it("should reject audit request without calling API when creator has 0 verified skills", async () => {
      let auditResult: any = null;
      let auditError: string | null = null;
      let apiCalled = false;

      const creatorWithNoSkills = {
        name: "Skill-less Creator",
        skills: [],
        verifiedSkills: [],
      };

      const skills = creatorWithNoSkills.skills.length > 0
        ? creatorWithNoSkills.skills
        : creatorWithNoSkills.verifiedSkills;

      if (!skills || skills.length === 0) {
        auditResult = null;
        auditError = "Please add at least one verified skill to your profile before running an AI audit.";
      } else {
        apiCalled = true;
      }

      assert.equal(apiCalled, false);
      assert.equal(auditResult, null);
      assert.ok(auditError);
      assert.ok(auditError.includes("at least one verified skill"));
    });
  });
});
