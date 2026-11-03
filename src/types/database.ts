
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "dictation_attempts": {
                  Row: {
                    "accuracy": number,"answer_revealed": boolean,"created_at": string,"duration_ms": number | null,"error_summary": NonNullable<Json>,"hints_used": number,"id": string,"is_correct": boolean,"segment_id": string,"session_id": string | null,"skipped": boolean,"user_id": string,"user_input": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy": number,"answer_revealed"?: boolean,"created_at"?: string,"duration_ms"?: number | null,"error_summary"?: NonNullable<Json>,"hints_used"?: number,"id"?: string,"is_correct": boolean,"segment_id": string,"session_id"?: string | null,"skipped"?: boolean,"user_id"?: string,"user_input": string
                  }
                  Update: {
                    "accuracy"?: number,"answer_revealed"?: boolean,"created_at"?: string,"duration_ms"?: number | null,"error_summary"?: NonNullable<Json>,"hints_used"?: number,"id"?: string,"is_correct"?: boolean,"segment_id"?: string,"session_id"?: string | null,"skipped"?: boolean,"user_id"?: string,"user_input"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dictation_attempts_segment_id_fkey"
      columns: ["segment_id"]
isOneToOne: false
      referencedRelation: "video_segments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dictation_attempts_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "study_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dictation_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dictionary_entries": {
                  Row: {
                    "created_at": string,"example": string | null,"example_vi": string | null,"id": string,"language": Database["public"]['Enums']["language_code"],"meaning_vi": string,"part_of_speech": string | null,"reading": string | null,"term": string,"term_normalized": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"example"?: string | null,"example_vi"?: string | null,"id"?: string,"language": Database["public"]['Enums']["language_code"],"meaning_vi": string,"part_of_speech"?: string | null,"reading"?: string | null,"term": string,"term_normalized"?: never
                  }
                  Update: {
                    "created_at"?: string,"example"?: string | null,"example_vi"?: string | null,"id"?: string,"language"?: Database["public"]['Enums']["language_code"],"meaning_vi"?: string,"part_of_speech"?: string | null,"reading"?: string | null,"term"?: string,"term_normalized"?: never
                  }
                  Relationships: [
                    
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"user_id": string,"video_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id"?: string,"video_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string,"video_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "video_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    }
                  ]
                },"learning_progress": {
                  Row: {
                    "completed_at": string | null,"last_segment_position": number,"last_studied_at": string,"started_at": string,"status": Database["public"]['Enums']["progress_status"],"user_id": string,"video_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"last_segment_position"?: number,"last_studied_at"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["progress_status"],"user_id"?: string,"video_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"last_segment_position"?: number,"last_studied_at"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["progress_status"],"user_id"?: string,"video_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "learning_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_progress_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "video_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_progress_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"daily_goal_minutes": number,"display_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"settings": NonNullable<Json>,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"daily_goal_minutes"?: number,"display_name": string,"id": string,"role"?: Database["public"]['Enums']["user_role"],"settings"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"daily_goal_minutes"?: number,"display_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"settings"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"study_sessions": {
                  Row: {
                    "active_seconds": number,"id": string,"kind": Database["public"]['Enums']["session_kind"],"language": Database["public"]['Enums']["language_code"],"last_active_at": string,"started_at": string,"user_id": string,"video_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active_seconds"?: number,"id"?: string,"kind": Database["public"]['Enums']["session_kind"],"language": Database["public"]['Enums']["language_code"],"last_active_at"?: string,"started_at"?: string,"user_id"?: string,"video_id"?: string | null
                  }
                  Update: {
                    "active_seconds"?: number,"id"?: string,"kind"?: Database["public"]['Enums']["session_kind"],"language"?: Database["public"]['Enums']["language_code"],"last_active_at"?: string,"started_at"?: string,"user_id"?: string,"video_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_sessions_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "video_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_sessions_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "id": number,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: never,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"transcripts": {
                  Row: {
                    "created_at": string,"created_by": string | null,"format": Database["public"]['Enums']["transcript_format"],"id": string,"is_active": boolean,"notes": string | null,"source_file_path": string | null,"video_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"format": Database["public"]['Enums']["transcript_format"],"id"?: string,"is_active"?: boolean,"notes"?: string | null,"source_file_path"?: string | null,"video_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"format"?: Database["public"]['Enums']["transcript_format"],"id"?: string,"is_active"?: boolean,"notes"?: string | null,"source_file_path"?: string | null,"video_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transcripts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transcripts_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "video_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transcripts_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    }
                  ]
                },"video_segments": {
                  Row: {
                    "created_at": string,"difficulty": number | null,"end_time": number,"id": string,"pinyin": string | null,"position": number,"start_time": number,"text": string,"transcript_id": string | null,"translation_vi": string | null,"updated_at": string,"video_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"difficulty"?: number | null,"end_time": number,"id"?: string,"pinyin"?: string | null,"position": number,"start_time": number,"text": string,"transcript_id"?: string | null,"translation_vi"?: string | null,"updated_at"?: string,"video_id": string
                  }
                  Update: {
                    "created_at"?: string,"difficulty"?: number | null,"end_time"?: number,"id"?: string,"pinyin"?: string | null,"position"?: number,"start_time"?: number,"text"?: string,"transcript_id"?: string | null,"translation_vi"?: string | null,"updated_at"?: string,"video_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "video_segments_transcript_id_fkey"
      columns: ["transcript_id"]
isOneToOne: false
      referencedRelation: "transcripts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "video_segments_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "video_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "video_segments_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    }
                  ]
                },"videos": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"difficulty": number,"duration_seconds": number | null,"external_url": string | null,"id": string,"is_published": boolean,"is_sample": boolean,"language": Database["public"]['Enums']["language_code"],"level": Database["public"]['Enums']["cefr_level"],"license_note": string | null,"source_name": string,"source_type": Database["public"]['Enums']["video_source"],"storage_path": string | null,"thumbnail_url": string | null,"title": string,"topic_id": number | null,"updated_at": string,"youtube_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"difficulty"?: number,"duration_seconds"?: number | null,"external_url"?: string | null,"id"?: string,"is_published"?: boolean,"is_sample"?: boolean,"language": Database["public"]['Enums']["language_code"],"level": Database["public"]['Enums']["cefr_level"],"license_note"?: string | null,"source_name": string,"source_type": Database["public"]['Enums']["video_source"],"storage_path"?: string | null,"thumbnail_url"?: string | null,"title": string,"topic_id"?: number | null,"updated_at"?: string,"youtube_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"difficulty"?: number,"duration_seconds"?: number | null,"external_url"?: string | null,"id"?: string,"is_published"?: boolean,"is_sample"?: boolean,"language"?: Database["public"]['Enums']["language_code"],"level"?: Database["public"]['Enums']["cefr_level"],"license_note"?: string | null,"source_name"?: string,"source_type"?: Database["public"]['Enums']["video_source"],"storage_path"?: string | null,"thumbnail_url"?: string | null,"title"?: string,"topic_id"?: number | null,"updated_at"?: string,"youtube_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "videos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "videos_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"vocabulary": {
                  Row: {
                    "created_at": string,"due_at": string,"ease_factor": number,"example": string | null,"id": string,"interval_days": number,"language": Database["public"]['Enums']["language_code"],"lapses": number,"last_reviewed_at": string | null,"meaning_vi": string | null,"notes": string | null,"part_of_speech": string | null,"reading": string | null,"repetitions": number,"source_segment_id": string | null,"source_video_id": string | null,"status": Database["public"]['Enums']["vocab_status"],"term": string,"term_normalized": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"due_at"?: string,"ease_factor"?: number,"example"?: string | null,"id"?: string,"interval_days"?: number,"language": Database["public"]['Enums']["language_code"],"lapses"?: number,"last_reviewed_at"?: string | null,"meaning_vi"?: string | null,"notes"?: string | null,"part_of_speech"?: string | null,"reading"?: string | null,"repetitions"?: number,"source_segment_id"?: string | null,"source_video_id"?: string | null,"status"?: Database["public"]['Enums']["vocab_status"],"term": string,"term_normalized"?: never,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"due_at"?: string,"ease_factor"?: number,"example"?: string | null,"id"?: string,"interval_days"?: number,"language"?: Database["public"]['Enums']["language_code"],"lapses"?: number,"last_reviewed_at"?: string | null,"meaning_vi"?: string | null,"notes"?: string | null,"part_of_speech"?: string | null,"reading"?: string | null,"repetitions"?: number,"source_segment_id"?: string | null,"source_video_id"?: string | null,"status"?: Database["public"]['Enums']["vocab_status"],"term"?: string,"term_normalized"?: never,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_source_segment_id_fkey"
      columns: ["source_segment_id"]
isOneToOne: false
      referencedRelation: "video_segments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vocabulary_source_video_id_fkey"
      columns: ["source_video_id"]
isOneToOne: false
      referencedRelation: "video_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vocabulary_source_video_id_fkey"
      columns: ["source_video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vocabulary_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"vocabulary_reviews": {
                  Row: {
                    "duration_ms": number | null,"id": number,"new_ease": number,"new_interval_days": number,"prev_ease": number,"prev_interval_days": number,"rating": Database["public"]['Enums']["review_rating"],"reviewed_at": string,"user_id": string,"vocabulary_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "duration_ms"?: number | null,"id"?: never,"new_ease": number,"new_interval_days": number,"prev_ease": number,"prev_interval_days": number,"rating": Database["public"]['Enums']["review_rating"],"reviewed_at"?: string,"user_id"?: string,"vocabulary_id": string
                  }
                  Update: {
                    "duration_ms"?: number | null,"id"?: never,"new_ease"?: number,"new_interval_days"?: number,"prev_ease"?: number,"prev_interval_days"?: number,"rating"?: Database["public"]['Enums']["review_rating"],"reviewed_at"?: string,"user_id"?: string,"vocabulary_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_reviews_vocabulary_id_user_id_fkey"
      columns: ["vocabulary_id","user_id"]
isOneToOne: false
      referencedRelation: "vocabulary"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            "user_video_progress": {
                  Row: {
                    "avg_accuracy": number | null,"completed_at": string | null,"finished_segments": number | null,"last_segment_position": number,"last_studied_at": string,"status": Database["public"]['Enums']["progress_status"],"user_id": string,"video_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "learning_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_progress_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "video_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_progress_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    }
                  ]
                },"video_catalog": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"difficulty": number,"duration_seconds": number | null,"external_url": string | null,"id": string,"is_published": boolean,"is_sample": boolean,"language": Database["public"]['Enums']["language_code"],"level": Database["public"]['Enums']["cefr_level"],"license_note": string | null,"segment_count": number | null,"source_name": string,"source_type": Database["public"]['Enums']["video_source"],"storage_path": string | null,"thumbnail_url": string | null,"title": string,"topic_id": number | null,"topic_name": string | null,"topic_slug": string | null,"updated_at": string,"word_count": number | null,"youtube_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "videos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "videos_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "get_daily_activity":
{ Args: { "p_days"?: number,"p_language"?: Database["public"]['Enums']["language_code"] }; Returns: {
              "active_seconds": number,"attempts": number,"day": string,"reviews": number
            }[]
                           },
"get_learning_streak":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"record_review":
{ Args: { "p_due_at": string,"p_duration_ms"?: number,"p_new_ease": number,"p_new_interval": number,"p_new_reps": number,"p_new_status": Database["public"]['Enums']["vocab_status"],"p_rating": Database["public"]['Enums']["review_rating"],"p_vocabulary_id": string }; Returns: {
              "created_at": string,
"due_at": string,
"ease_factor": number,
"example": string | null,
"id": string,
"interval_days": number,
"language": Database["public"]['Enums']["language_code"],
"lapses": number,
"last_reviewed_at": string | null,
"meaning_vi": string | null,
"notes": string | null,
"part_of_speech": string | null,
"reading": string | null,
"repetitions": number,
"source_segment_id": string | null,
"source_video_id": string | null,
"status": Database["public"]['Enums']["vocab_status"],
"term": string,
"term_normalized": string | null,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "vocabulary"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "cefr_level": "beginner"|"elementary"|"intermediate"|"upper_intermediate"|"advanced","language_code": "en"|"zh","progress_status": "in_progress"|"completed","review_rating": "again"|"hard"|"good"|"easy","session_kind": "dictation"|"review","transcript_format": "manual"|"srt"|"vtt","user_role": "learner"|"admin","video_source": "youtube"|"upload"|"external_url","vocab_status": "new"|"learning"|"reviewing"|"mastered"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "cefr_level": ["beginner", "elementary", "intermediate", "upper_intermediate", "advanced"],"language_code": ["en", "zh"],"progress_status": ["in_progress", "completed"],"review_rating": ["again", "hard", "good", "easy"],"session_kind": ["dictation", "review"],"transcript_format": ["manual", "srt", "vtt"],"user_role": ["learner", "admin"],"video_source": ["youtube", "upload", "external_url"],"vocab_status": ["new", "learning", "reviewing", "mastered"]
          }
        }
} as const
