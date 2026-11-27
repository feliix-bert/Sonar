export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "student" | "volunteer" | "admin";
export type CourseMemberRole = "student" | "reviewer" | "instructor";
export type ProcessingStatus =
  | "queued"
  | "extracting"
  | "ocr"
  | "structuring"
  | "enriching"
  | "embedding"
  | "completed"
  | "failed";
export type ReviewStatus =
  | "unreviewed"
  | "in_review"
  | "needs_revision"
  | "verified";
export type BlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "equation"
  | "figure";
export type SharePermission = "view" | "comment" | "edit";
export type JobStage =
  | "validate"
  | "extract_text"
  | "ocr_pages"
  | "structure"
  | "math_narration"
  | "figure_vision"
  | "embed_rag"
  | "finalize";
export type NotificationType =
  | "processing_completed"
  | "processing_failed"
  | "review_completed"
  | "share_granted"
  | "system";

export interface LayeredFigureDescription {
  figureType: string;
  summary: string;
  axesAndUnits?: string;
  trends?: string;
  keyPoints?: string[];
  uncertaintyNotes?: string;
}

export interface TableStructureData {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          study_program: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          study_program?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          study_program?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: AppRole;
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          role?: AppRole;
          granted_by?: string | null;
        };
        Relationships: [];
      };
      accessibility_preferences: {
        Row: {
          user_id: string;
          reading_font: "atkinson" | "inter" | "lexend";
          font_size_px: number;
          line_height: number;
          letter_spacing_em: number;
          reading_width: "narrow" | "comfortable" | "wide";
          contrast_mode: "standard" | "high";
          reading_surface: "default" | "warm";
          narration_speed: number;
          reduced_motion: boolean;
          preferred_language: "en" | "id";
          updated_at: string;
        };
        Insert: {
          user_id: string;
          reading_font?: "atkinson" | "inter" | "lexend";
          font_size_px?: number;
          line_height?: number;
          letter_spacing_em?: number;
          reading_width?: "narrow" | "comfortable" | "wide";
          contrast_mode?: "standard" | "high";
          reading_surface?: "default" | "warm";
          narration_speed?: number;
          reduced_motion?: boolean;
          preferred_language?: "en" | "id";
          updated_at?: string;
        };
        Update: {
          reading_font?: "atkinson" | "inter" | "lexend";
          font_size_px?: number;
          line_height?: number;
          letter_spacing_em?: number;
          reading_width?: "narrow" | "comfortable" | "wide";
          contrast_mode?: "standard" | "high";
          reading_surface?: "default" | "warm";
          narration_speed?: number;
          reduced_motion?: boolean;
          preferred_language?: "en" | "id";
          updated_at?: string;
        };
        Relationships: [];
      };
      math_narration_cache: {
        Row: {
          id: string;
          latex_hash: string;
          latex_normalized: string;
          narration_id: string;
          narration_en: string;
          exploration_tree: Json | null;
          source: string;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          latex_hash: string;
          latex_normalized: string;
          narration_id: string;
          narration_en: string;
          exploration_tree?: Json | null;
          source?: string;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          latex_hash?: string;
          latex_normalized?: string;
          narration_id?: string;
          narration_en?: string;
          exploration_tree?: Json | null;
          source?: string;
          verified?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          code: string;
          title: string;
          discipline: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          discipline?: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          title?: string;
          discipline?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_members: {
        Row: {
          id: string;
          course_id: string;
          user_id: string;
          member_role: CourseMemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          user_id: string;
          member_role?: CourseMemberRole;
          created_at?: string;
        };
        Update: {
          member_role?: CourseMemberRole;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          course_id: string;
          uploaded_by: string;
          title: string;
          original_filename: string;
          storage_path: string;
          file_hash: string;
          file_size_bytes: number;
          page_count: number;
          current_version_id: string | null;
          processing_status: ProcessingStatus;
          review_status: ReviewStatus;
          overall_confidence: number | null;
          language: "en" | "id";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          uploaded_by: string;
          title: string;
          original_filename: string;
          storage_path: string;
          file_hash: string;
          file_size_bytes: number;
          page_count?: number;
          current_version_id?: string | null;
          processing_status?: ProcessingStatus;
          review_status?: ReviewStatus;
          overall_confidence?: number | null;
          language?: "en" | "id";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          page_count?: number;
          current_version_id?: string | null;
          processing_status?: ProcessingStatus;
          review_status?: ReviewStatus;
          overall_confidence?: number | null;
          language?: "en" | "id";
          updated_at?: string;
        };
        Relationships: [];
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_number: number;
          source_storage_path: string;
          change_summary: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_number?: number;
          source_storage_path: string;
          change_summary?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          change_summary?: string | null;
        };
        Relationships: [];
      };
      document_pages: {
        Row: {
          id: string;
          document_id: string;
          version_id: string;
          page_number: number;
          has_text_layer: boolean;
          ocr_applied: boolean;
          raw_text: string | null;
          confidence_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_id: string;
          page_number: number;
          has_text_layer?: boolean;
          ocr_applied?: boolean;
          raw_text?: string | null;
          confidence_score?: number | null;
          created_at?: string;
        };
        Update: {
          has_text_layer?: boolean;
          ocr_applied?: boolean;
          raw_text?: string | null;
          confidence_score?: number | null;
        };
        Relationships: [];
      };
      document_sections: {
        Row: {
          id: string;
          document_id: string;
          version_id: string;
          heading_level: number;
          title: string;
          order_index: number;
          start_page: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_id: string;
          heading_level?: number;
          title: string;
          order_index: number;
          start_page?: number;
          created_at?: string;
        };
        Update: {
          heading_level?: number;
          title?: string;
          order_index?: number;
          start_page?: number;
        };
        Relationships: [];
      };
      document_blocks: {
        Row: {
          id: string;
          document_id: string;
          version_id: string;
          section_id: string | null;
          page_number: number;
          reading_order: number;
          block_type: BlockType;
          heading_level: number | null;
          content_text: string;
          content_html: string | null;
          spoken_text: string | null;
          ai_generated: boolean;
          confidence_score: number | null;
          needs_review: boolean;
          is_verified: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_id: string;
          section_id?: string | null;
          page_number: number;
          reading_order: number;
          block_type: BlockType;
          heading_level?: number | null;
          content_text: string;
          content_html?: string | null;
          spoken_text?: string | null;
          ai_generated?: boolean;
          confidence_score?: number | null;
          needs_review?: boolean;
          is_verified?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content_text?: string;
          content_html?: string | null;
          spoken_text?: string | null;
          confidence_score?: number | null;
          needs_review?: boolean;
          is_verified?: boolean;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_tables: {
        Row: {
          id: string;
          block_id: string;
          document_id: string;
          caption: string | null;
          headers: Json;
          rows: Json;
          row_count: number;
          column_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          block_id: string;
          document_id: string;
          caption?: string | null;
          headers: Json;
          rows: Json;
          row_count: number;
          column_count: number;
          created_at?: string;
        };
        Update: {
          caption?: string | null;
          headers?: Json;
          rows?: Json;
          row_count?: number;
          column_count?: number;
        };
        Relationships: [];
      };
      document_equations: {
        Row: {
          id: string;
          block_id: string;
          document_id: string;
          latex: string;
          mathml: string | null;
          narration_en: string;
          narration_id: string;
          is_supported: boolean;
          unsupported_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          block_id: string;
          document_id: string;
          latex: string;
          mathml?: string | null;
          narration_en: string;
          narration_id: string;
          is_supported?: boolean;
          unsupported_reason?: string | null;
          created_at?: string;
        };
        Update: {
          latex?: string;
          mathml?: string | null;
          narration_en?: string;
          narration_id?: string;
          is_supported?: boolean;
          unsupported_reason?: string | null;
        };
        Relationships: [];
      };
      document_figures: {
        Row: {
          id: string;
          block_id: string;
          document_id: string;
          figure_label: string;
          figure_type: string;
          summary: string;
          axes_and_units: string | null;
          trends: string | null;
          key_points: Json;
          uncertainty_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          block_id: string;
          document_id: string;
          figure_label: string;
          figure_type: string;
          summary: string;
          axes_and_units?: string | null;
          trends?: string | null;
          key_points?: Json;
          uncertainty_notes?: string | null;
          created_at?: string;
        };
        Update: {
          figure_label?: string;
          figure_type?: string;
          summary?: string;
          axes_and_units?: string | null;
          trends?: string | null;
          key_points?: Json;
          uncertainty_notes?: string | null;
        };
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          version_id: string;
          chunk_index: number;
          page_number: number;
          section_heading: string | null;
          block_ids: string[];
          content: string;
          token_count: number;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_id: string;
          chunk_index: number;
          page_number: number;
          section_heading?: string | null;
          block_ids: string[];
          content: string;
          token_count?: number;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          embedding?: number[] | null;
        };
        Relationships: [];
      };
      document_reviews: {
        Row: {
          id: string;
          document_id: string;
          version_id: string;
          reviewer_id: string;
          status: ReviewStatus;
          notes: string | null;
          started_at: string;
          completed_at: string | null;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_id: string;
          reviewer_id: string;
          status?: ReviewStatus;
          notes?: string | null;
          started_at?: string;
          completed_at?: string | null;
          duration_seconds?: number | null;
        };
        Update: {
          status?: ReviewStatus;
          notes?: string | null;
          completed_at?: string | null;
          duration_seconds?: number | null;
        };
        Relationships: [];
      };
      review_comments: {
        Row: {
          id: string;
          review_id: string;
          block_id: string | null;
          author_id: string;
          body: string;
          previous_text: string | null;
          revised_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          block_id?: string | null;
          author_id: string;
          body: string;
          previous_text?: string | null;
          revised_text?: string | null;
          created_at?: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [];
      };
      document_shares: {
        Row: {
          id: string;
          document_id: string;
          shared_with_user_id: string;
          granted_by: string;
          permission: SharePermission;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          shared_with_user_id: string;
          granted_by: string;
          permission?: SharePermission;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          permission?: SharePermission;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          citations: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          citations?: Json;
          created_at?: string;
        };
        Update: {
          content?: string;
          citations?: Json;
        };
        Relationships: [];
      };
      processing_jobs: {
        Row: {
          id: string;
          document_id: string;
          version_id: string;
          inngest_run_id: string | null;
          status: ProcessingStatus;
          current_stage: JobStage;
          progress_percent: number;
          attempts: number;
          error_message: string | null;
          logs: Json;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_id: string;
          inngest_run_id?: string | null;
          status?: ProcessingStatus;
          current_stage?: JobStage;
          progress_percent?: number;
          attempts?: number;
          error_message?: string | null;
          logs?: Json;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          inngest_run_id?: string | null;
          status?: ProcessingStatus;
          current_stage?: JobStage;
          progress_percent?: number;
          attempts?: number;
          error_message?: string | null;
          logs?: Json;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          href: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          href?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: { required_role: AppRole };
        Returns: boolean;
      };
      is_course_member: {
        Args: { target_course_id: string };
        Returns: boolean;
      };
      can_access_document: {
        Args: { target_document_id: string };
        Returns: boolean;
      };
      can_review_document: {
        Args: { target_document_id: string };
        Returns: boolean;
      };
      match_document_chunks: {
        Args: {
          p_document_id: string;
          p_query_embedding: number[];
          p_query_text?: string;
          p_match_count?: number;
          p_similarity_threshold?: number;
        };
        Returns: Array<{
          chunk_id: string;
          document_id: string;
          version_id: string;
          page_number: number;
          section_heading: string | null;
          block_ids: string[];
          content: string;
          similarity: number;
          hybrid_score: number;
        }>;
      };
    };
    Enums: {
      app_role: AppRole;
      course_member_role: CourseMemberRole;
      processing_status: ProcessingStatus;
      review_status: ReviewStatus;
      block_type: BlockType;
      share_permission: SharePermission;
      job_stage: JobStage;
      notification_type: NotificationType;
    };
  };
}
