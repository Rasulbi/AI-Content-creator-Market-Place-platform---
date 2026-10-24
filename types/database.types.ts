export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "creator" | "brand" | "admin";
export type VerificationStatusType =
  | "claimed"
  | "portfolio_evidence"
  | "test_verified"
  | "client_verified";
export type TestDifficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type TestSubmissionStatus = "pending" | "evaluating" | "passed" | "failed";
export type CampaignStatus = "draft" | "active" | "in_progress" | "completed" | "cancelled";
export type MatchStatus = "suggested" | "invited" | "accepted" | "declined" | "hired";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          full_name: string;
          avatar_url: string | null;
          company_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          full_name: string;
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          full_name?: string;
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creator_profiles: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          name: string;
          bio: string | null;
          experience_years: number;
          experience_level: "junior" | "intermediate" | "senior" | "expert";
          availability: "available" | "busy" | "unavailable";
          hourly_rate: number | null;
          min_budget: number;
          max_budget: number;
          ai_tools: string[];
          platforms: string[];
          category: string;
          location: string | null;
          passport_score: number;
          client_rating: number;
          total_reviews: number;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          slug: string;
          name: string;
          bio?: string | null;
          experience_years?: number;
          experience_level?: "junior" | "intermediate" | "senior" | "expert";
          availability?: "available" | "busy" | "unavailable";
          hourly_rate?: number | null;
          min_budget?: number;
          max_budget?: number;
          ai_tools?: string[];
          platforms?: string[];
          category?: string;
          location?: string | null;
          passport_score?: number;
          client_rating?: number;
          total_reviews?: number;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          slug?: string;
          name?: string;
          bio?: string | null;
          experience_years?: number;
          experience_level?: "junior" | "intermediate" | "senior" | "expert";
          availability?: "available" | "busy" | "unavailable";
          hourly_rate?: number | null;
          min_budget?: number;
          max_budget?: number;
          ai_tools?: string[];
          platforms?: string[];
          category?: string;
          location?: string | null;
          passport_score?: number;
          client_rating?: number;
          total_reviews?: number;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          weight: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          weight?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          description?: string | null;
          weight?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      creator_skills: {
        Row: {
          id: string;
          creator_profile_id: string;
          skill_id: string;
          verification_status: VerificationStatusType;
          score: number;
          evidence_text: string | null;
          evidence_url: string | null;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_profile_id: string;
          skill_id: string;
          verification_status?: VerificationStatusType;
          score?: number;
          evidence_text?: string | null;
          evidence_url?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_profile_id?: string;
          skill_id?: string;
          verification_status?: VerificationStatusType;
          score?: number;
          evidence_text?: string | null;
          evidence_url?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_skills_creator_profile_id_fkey";
            columns: ["creator_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creator_skills_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          }
        ];
      };
      portfolio_projects: {
        Row: {
          id: string;
          creator_profile_id: string;
          title: string;
          description: string;
          content_type: string;
          tools_used: string[];
          media_url: string;
          prompt: string | null;
          process_evidence: string | null;
          external_url: string | null;
          linked_skill_ids: string[];
          metrics: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_profile_id: string;
          title: string;
          description: string;
          content_type: string;
          tools_used?: string[];
          media_url: string;
          prompt?: string | null;
          process_evidence?: string | null;
          external_url?: string | null;
          linked_skill_ids?: string[];
          metrics?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_profile_id?: string;
          title?: string;
          description?: string;
          content_type?: string;
          tools_used?: string[];
          media_url?: string;
          prompt?: string | null;
          process_evidence?: string | null;
          external_url?: string | null;
          linked_skill_ids?: string[];
          metrics?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_creator_profile_id_fkey";
            columns: ["creator_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      skill_tests: {
        Row: {
          id: string;
          skill_id: string;
          title: string;
          description: string;
          difficulty: TestDifficulty;
          passing_score: number;
          duration_minutes: number;
          questions: Json;
          rubric: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          skill_id: string;
          title: string;
          description: string;
          difficulty?: TestDifficulty;
          passing_score?: number;
          duration_minutes?: number;
          questions?: Json;
          rubric?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          skill_id?: string;
          title?: string;
          description?: string;
          difficulty?: TestDifficulty;
          passing_score?: number;
          duration_minutes?: number;
          questions?: Json;
          rubric?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "skill_tests_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          }
        ];
      };
      test_submissions: {
        Row: {
          id: string;
          test_id: string;
          creator_profile_id: string;
          answers: Json;
          evidence_media_urls: string[];
          score: number | null;
          status: TestSubmissionStatus;
          feedback: string | null;
          evaluated_by: string | null;
          evaluated_at: string | null;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          test_id: string;
          creator_profile_id: string;
          answers?: Json;
          evidence_media_urls?: string[];
          score?: number | null;
          status?: TestSubmissionStatus;
          feedback?: string | null;
          evaluated_by?: string | null;
          evaluated_at?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          test_id?: string;
          creator_profile_id?: string;
          answers?: Json;
          evidence_media_urls?: string[];
          score?: number | null;
          status?: TestSubmissionStatus;
          feedback?: string | null;
          evaluated_by?: string | null;
          evaluated_at?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_submissions_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "skill_tests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_submissions_creator_profile_id_fkey";
            columns: ["creator_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      campaigns: {
        Row: {
          id: string;
          brand_id: string;
          title: string;
          description: string;
          category: string;
          target_audience: string | null;
          required_skills: string[];
          content_formats: string[];
          budget_min: number;
          budget_max: number;
          status: CampaignStatus;
          deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          title: string;
          description: string;
          category: string;
          target_audience?: string | null;
          required_skills?: string[];
          content_formats?: string[];
          budget_min?: number;
          budget_max?: number;
          status?: CampaignStatus;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          title?: string;
          description?: string;
          category?: string;
          target_audience?: string | null;
          required_skills?: string[];
          content_formats?: string[];
          budget_min?: number;
          budget_max?: number;
          status?: CampaignStatus;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          id: string;
          campaign_id: string;
          creator_profile_id: string;
          match_score: number;
          status: MatchStatus;
          score_breakdown: Json;
          proposal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          creator_profile_id: string;
          match_score: number;
          status?: MatchStatus;
          score_breakdown?: Json;
          proposal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          creator_profile_id?: string;
          match_score?: number;
          status?: MatchStatus;
          score_breakdown?: Json;
          proposal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_creator_profile_id_fkey";
            columns: ["creator_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      reviews: {
        Row: {
          id: string;
          campaign_id: string;
          brand_id: string;
          creator_profile_id: string;
          rating: number;
          review_text: string;
          verified_skills: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          brand_id: string;
          creator_profile_id: string;
          rating: number;
          review_text: string;
          verified_skills?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          brand_id?: string;
          creator_profile_id?: string;
          rating?: number;
          review_text?: string;
          verified_skills?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_creator_profile_id_fkey";
            columns: ["creator_profile_id"];
            isOneToOne: false;
            referencedRelation: "creator_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_advisor_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          role: string;
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id: string;
          role: string;
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string;
          role?: string;
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_advisor_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_ai_content: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          concept: string;
          hook: string;
          caption: string;
          hashtags: string[];
          call_to_action: string;
          video_script_outline: Json;
          niche: string;
          platform: string;
          content_goal: string | null;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          concept: string;
          hook: string;
          caption: string;
          hashtags?: string[];
          call_to_action: string;
          video_script_outline?: Json;
          niche?: string;
          platform?: string;
          content_goal?: string | null;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          concept?: string;
          hook?: string;
          caption?: string;
          hashtags?: string[];
          call_to_action?: string;
          video_script_outline?: Json;
          niche?: string;
          platform?: string;
          content_goal?: string | null;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_ai_content_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      campaign_verifications: {
        Row: {
          id: string;
          brand_id: string;
          brand_name: string;
          product_name: string;
          category: string;
          platform: string;
          target_audience: string | null;
          budget: string | null;
          deadline: string | null;
          verifications_count: number;
          verifications_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          brand_name: string;
          product_name: string;
          category: string;
          platform?: string;
          target_audience?: string | null;
          budget?: string | null;
          deadline?: string | null;
          verifications_count?: number;
          verifications_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          brand_name?: string;
          product_name?: string;
          category?: string;
          platform?: string;
          target_audience?: string | null;
          budget?: string | null;
          deadline?: string | null;
          verifications_count?: number;
          verifications_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_verifications_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      public_user_profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          role: UserRole;
          company_name: string | null;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      verification_status_type: VerificationStatusType;
      test_difficulty: TestDifficulty;
      test_submission_status: TestSubmissionStatus;
      campaign_status: CampaignStatus;
      match_status: MatchStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
