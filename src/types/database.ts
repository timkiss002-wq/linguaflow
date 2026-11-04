
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "dictation_attempts": {
                  Row: {
                    "accuracy": number,"answer_revealed": boolean,"created_at": string,"duration_ms": number | null,"error_summary": NonNullable<Json>,"hints_used": number,"id": string,"is_correct": boolean,"sentence_id": string,"session_id": string | null,"skipped": boolean,"user_id": string,"user_input": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy": number,"answer_revealed"?: boolean,"created_at"?: string,"duration_ms"?: number | null,"error_summary"?: NonNullable<Json>,"hints_used"?: number,"id"?: string,"is_correct": boolean,"sentence_id": string,"session_id"?: string | null,"skipped"?: boolean,"user_id"?: string,"user_input": string
                  }
                  Update: {
                    "accuracy"?: number,"answer_revealed"?: boolean,"created_at"?: string,"duration_ms"?: number | null,"error_summary"?: NonNullable<Json>,"hints_used"?: number,"id"?: string,"is_correct"?: boolean,"sentence_id"?: string,"session_id"?: string | null,"skipped"?: boolean,"user_id"?: string,"user_input"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dictation_attempts_segment_id_fkey"
      columns: ["sentence_id"]
isOneToOne: false
      referencedRelation: "lesson_sentences"
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
                    "created_at": string,"lesson_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"lesson_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"lesson_id"?: string,"user_id"?: string
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
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lesson_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_video_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"learning_progress": {
                  Row: {
                    "completed_at": string | null,"last_sentence_position": number,"last_studied_at": string,"lesson_id": string,"started_at": string,"status": Database["public"]['Enums']["progress_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"last_sentence_position"?: number,"last_studied_at"?: string,"lesson_id": string,"started_at"?: string,"status"?: Database["public"]['Enums']["progress_status"],"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"last_sentence_position"?: number,"last_studied_at"?: string,"lesson_id"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["progress_status"],"user_id"?: string
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
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lesson_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_progress_video_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_sentences": {
                  Row: {
                    "created_at": string,"difficulty": number | null,"id": string,"lesson_id": string,"pinyin": string | null,"position": number,"text": string,"translation_vi": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"difficulty"?: number | null,"id"?: string,"lesson_id": string,"pinyin"?: string | null,"position": number,"text": string,"translation_vi"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"difficulty"?: number | null,"id"?: string,"lesson_id"?: string,"pinyin"?: string | null,"position"?: number,"text"?: string,"translation_vi"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "video_segments_video_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lesson_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "video_segments_video_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"difficulty": number,"hsk_level": number | null,"id": string,"is_published": boolean,"is_sample": boolean,"language": Database["public"]['Enums']["language_code"],"level": Database["public"]['Enums']["cefr_level"],"source": string,"title": string,"topic_id": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"difficulty"?: number,"hsk_level"?: number | null,"id"?: string,"is_published"?: boolean,"is_sample"?: boolean,"language": Database["public"]['Enums']["language_code"],"level": Database["public"]['Enums']["cefr_level"],"source": string,"title": string,"topic_id"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"difficulty"?: number,"hsk_level"?: number | null,"id"?: string,"is_published"?: boolean,"is_sample"?: boolean,"language"?: Database["public"]['Enums']["language_code"],"level"?: Database["public"]['Enums']["cefr_level"],"source"?: string,"title"?: string,"topic_id"?: number | null,"updated_at"?: string
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
                },"practice_attempts": {
                  Row: {
                    "created_at": string,"id": number,"is_correct": boolean,"level_after": number,"level_before": number,"mode": string,"typed": string,"user_id": string,"vocabulary_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"is_correct": boolean,"level_after": number,"level_before": number,"mode": string,"typed": string,"user_id"?: string,"vocabulary_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"is_correct"?: boolean,"level_after"?: number,"level_before"?: number,"mode"?: string,"typed"?: string,"user_id"?: string,"vocabulary_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "practice_attempts_vocabulary_id_user_id_fkey"
      columns: ["vocabulary_id","user_id"]
isOneToOne: false
      referencedRelation: "vocabulary"
      referencedColumns: ["id","user_id"]
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
                    "active_seconds": number,"id": string,"kind": Database["public"]['Enums']["session_kind"],"language": Database["public"]['Enums']["language_code"],"last_active_at": string,"lesson_id": string | null,"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_seconds"?: number,"id"?: string,"kind": Database["public"]['Enums']["session_kind"],"language": Database["public"]['Enums']["language_code"],"last_active_at"?: string,"lesson_id"?: string | null,"started_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "active_seconds"?: number,"id"?: string,"kind"?: Database["public"]['Enums']["session_kind"],"language"?: Database["public"]['Enums']["language_code"],"last_active_at"?: string,"lesson_id"?: string | null,"started_at"?: string,"user_id"?: string
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
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lesson_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_sessions_video_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
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
                },"vocabulary": {
                  Row: {
                    "context_sentence": string | null,"created_at": string,"due_at": string,"ease_factor": number,"example": string | null,"examples": (string)[],"id": string,"interval_days": number,"language": Database["public"]['Enums']["language_code"],"lapses": number,"last_reviewed_at": string | null,"last_typed_at": string | null,"meaning_vi": string | null,"notes": string | null,"part_of_speech": string | null,"reading": string | null,"repetitions": number,"review_correct": boolean,"review_input": string,"source_lesson_id": string | null,"source_sentence_id": string | null,"status": Database["public"]['Enums']["vocab_status"],"term": string,"term_normalized": string | null,"topic": string | null,"typing_level": number,"typing_streak": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "context_sentence"?: string | null,"created_at"?: string,"due_at"?: string,"ease_factor"?: number,"example"?: string | null,"examples"?: (string)[],"id"?: string,"interval_days"?: number,"language": Database["public"]['Enums']["language_code"],"lapses"?: number,"last_reviewed_at"?: string | null,"last_typed_at"?: string | null,"meaning_vi"?: string | null,"notes"?: string | null,"part_of_speech"?: string | null,"reading"?: string | null,"repetitions"?: number,"review_correct"?: boolean,"review_input"?: string,"source_lesson_id"?: string | null,"source_sentence_id"?: string | null,"status"?: Database["public"]['Enums']["vocab_status"],"term": string,"term_normalized"?: never,"topic"?: string | null,"typing_level"?: number,"typing_streak"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "context_sentence"?: string | null,"created_at"?: string,"due_at"?: string,"ease_factor"?: number,"example"?: string | null,"examples"?: (string)[],"id"?: string,"interval_days"?: number,"language"?: Database["public"]['Enums']["language_code"],"lapses"?: number,"last_reviewed_at"?: string | null,"last_typed_at"?: string | null,"meaning_vi"?: string | null,"notes"?: string | null,"part_of_speech"?: string | null,"reading"?: string | null,"repetitions"?: number,"review_correct"?: boolean,"review_input"?: string,"source_lesson_id"?: string | null,"source_sentence_id"?: string | null,"status"?: Database["public"]['Enums']["vocab_status"],"term"?: string,"term_normalized"?: never,"topic"?: string | null,"typing_level"?: number,"typing_streak"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vocabulary_source_segment_id_fkey"
      columns: ["source_sentence_id"]
isOneToOne: false
      referencedRelation: "lesson_sentences"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vocabulary_source_video_id_fkey"
      columns: ["source_lesson_id"]
isOneToOne: false
      referencedRelation: "lesson_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vocabulary_source_video_id_fkey"
      columns: ["source_lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
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
                },"word_families": {
                  Row: {
                    "id": string,"note": string | null,"traps": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"note"?: string | null,"traps"?: (string)[]
                  }
                  Update: {
                    "id"?: string,"note"?: string | null,"traps"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"word_family_examples": {
                  Row: {
                    "answer": string,"answer_pos": string,"base_word": string,"family_id": string,"id": number,"sentence": string,"why": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"answer_pos": string,"base_word": string,"family_id": string,"id"?: never,"sentence": string,"why": string
                  }
                  Update: {
                    "answer"?: string,"answer_pos"?: string,"base_word"?: string,"family_id"?: string,"id"?: never,"sentence"?: string,"why"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "word_family_examples_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "word_families"
      referencedColumns: ["id"]
    }
                  ]
                },"word_family_members": {
                  Row: {
                    "family_id": string,"id": number,"meaning_vi": string | null,"pos": string,"word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "family_id": string,"id"?: never,"meaning_vi"?: string | null,"pos": string,"word": string
                  }
                  Update: {
                    "family_id"?: string,"id"?: never,"meaning_vi"?: string | null,"pos"?: string,"word"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "word_family_members_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "word_families"
      referencedColumns: ["id"]
    }
                  ]
                },"word_form_attempts": {
                  Row: {
                    "created_at": string,"exercise": string,"expected": string,"expected_pos": string,"family_id": string,"id": number,"result": string,"typed": string,"typed_pos": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exercise": string,"expected": string,"expected_pos": string,"family_id": string,"id"?: never,"result": string,"typed": string,"typed_pos"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"exercise"?: string,"expected"?: string,"expected_pos"?: string,"family_id"?: string,"id"?: never,"result"?: string,"typed"?: string,"typed_pos"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "word_form_attempts_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "word_families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "word_form_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "lesson_catalog": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"difficulty": number,"hsk_level": number | null,"id": string,"is_published": boolean,"is_sample": boolean,"language": Database["public"]['Enums']["language_code"],"level": Database["public"]['Enums']["cefr_level"],"sentence_count": number | null,"source": string,"title": string,"topic_id": number | null,"topic_name": string | null,"topic_slug": string | null,"updated_at": string,"word_count": number | null
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
                },"user_lesson_progress": {
                  Row: {
                    "avg_accuracy": number | null,"completed_at": string | null,"finished_sentences": number | null,"last_sentence_position": number,"last_studied_at": string,"lesson_id": string,"status": Database["public"]['Enums']["progress_status"],"user_id": string
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
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lesson_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "learning_progress_video_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
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
              "context_sentence": string | null,
"created_at": string,
"due_at": string,
"ease_factor": number,
"example": string | null,
"examples": (string)[],
"id": string,
"interval_days": number,
"language": Database["public"]['Enums']["language_code"],
"lapses": number,
"last_reviewed_at": string | null,
"last_typed_at": string | null,
"meaning_vi": string | null,
"notes": string | null,
"part_of_speech": string | null,
"reading": string | null,
"repetitions": number,
"review_correct": boolean,
"review_input": string,
"source_lesson_id": string | null,
"source_sentence_id": string | null,
"status": Database["public"]['Enums']["vocab_status"],
"term": string,
"term_normalized": string | null,
"topic": string | null,
"typing_level": number,
"typing_streak": number,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "vocabulary"
        isOneToOne: true
        isSetofReturn: false
      } },
"record_typing_practice":
{ Args: { "p_correct": boolean,"p_mode": string,"p_typed": string,"p_vocabulary_id": string }; Returns: {
              "context_sentence": string | null,
"created_at": string,
"due_at": string,
"ease_factor": number,
"example": string | null,
"examples": (string)[],
"id": string,
"interval_days": number,
"language": Database["public"]['Enums']["language_code"],
"lapses": number,
"last_reviewed_at": string | null,
"last_typed_at": string | null,
"meaning_vi": string | null,
"notes": string | null,
"part_of_speech": string | null,
"reading": string | null,
"repetitions": number,
"review_correct": boolean,
"review_input": string,
"source_lesson_id": string | null,
"source_sentence_id": string | null,
"status": Database["public"]['Enums']["vocab_status"],
"term": string,
"term_normalized": string | null,
"topic": string | null,
"typing_level": number,
"typing_streak": number,
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
            "cefr_level": "beginner"|"elementary"|"intermediate"|"upper_intermediate"|"advanced","language_code": "en"|"zh","progress_status": "in_progress"|"completed","review_rating": "again"|"hard"|"good"|"easy","session_kind": "dictation"|"review","user_role": "learner"|"admin","vocab_status": "new"|"learning"|"reviewing"|"mastered"
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
            "cefr_level": ["beginner", "elementary", "intermediate", "upper_intermediate", "advanced"],"language_code": ["en", "zh"],"progress_status": ["in_progress", "completed"],"review_rating": ["again", "hard", "good", "easy"],"session_kind": ["dictation", "review"],"user_role": ["learner", "admin"],"vocab_status": ["new", "learning", "reviewing", "mastered"]
          }
        }
} as const
