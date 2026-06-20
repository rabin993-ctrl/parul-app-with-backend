export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      adoption_listing_media: {
        Row: {
          idx: number
          listing_id: string
          media_id: string
        }
        Insert: {
          idx: number
          listing_id: string
          media_id: string
        }
        Update: {
          idx?: number
          listing_id?: string
          media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "adoption_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_listing_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_listing_saves: {
        Row: {
          listing_id: string
          user_id: string
        }
        Insert: {
          listing_id: string
          user_id: string
        }
        Update: {
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_listing_saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "adoption_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_listing_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "adoption_listing_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_listings: {
        Row: {
          adopted_date: string | null
          adopted_note: string | null
          age: string | null
          age_group: Database["public"]["Enums"]["age_group_enum"] | null
          breed: string | null
          created_at: string
          deleted_at: string | null
          gender: Database["public"]["Enums"]["gender_enum"] | null
          health_notes: string | null
          icon: string | null
          id: string
          location: string | null
          microchipped: boolean
          name: string
          neutered: boolean
          personality: string | null
          posted_at: string
          poster_user_id: string
          requirements: string[]
          species: Database["public"]["Enums"]["species_enum"]
          status: Database["public"]["Enums"]["adoption_listing_status_enum"]
          story: string | null
          tint: string | null
          updated_at: string
          urgent: boolean
          vaccination: Database["public"]["Enums"]["vaccination_enum"]
        }
        Insert: {
          adopted_date?: string | null
          adopted_note?: string | null
          age?: string | null
          age_group?: Database["public"]["Enums"]["age_group_enum"] | null
          breed?: string | null
          created_at?: string
          deleted_at?: string | null
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          health_notes?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          microchipped?: boolean
          name: string
          neutered?: boolean
          personality?: string | null
          posted_at?: string
          poster_user_id: string
          requirements?: string[]
          species: Database["public"]["Enums"]["species_enum"]
          status?: Database["public"]["Enums"]["adoption_listing_status_enum"]
          story?: string | null
          tint?: string | null
          updated_at?: string
          urgent?: boolean
          vaccination?: Database["public"]["Enums"]["vaccination_enum"]
        }
        Update: {
          adopted_date?: string | null
          adopted_note?: string | null
          age?: string | null
          age_group?: Database["public"]["Enums"]["age_group_enum"] | null
          breed?: string | null
          created_at?: string
          deleted_at?: string | null
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          health_notes?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          microchipped?: boolean
          name?: string
          neutered?: boolean
          personality?: string | null
          posted_at?: string
          poster_user_id?: string
          requirements?: string[]
          species?: Database["public"]["Enums"]["species_enum"]
          status?: Database["public"]["Enums"]["adoption_listing_status_enum"]
          story?: string | null
          tint?: string | null
          updated_at?: string
          urgent?: boolean
          vaccination?: Database["public"]["Enums"]["vaccination_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "adoption_listings_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "adoption_listings_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_records: {
        Row: {
          adopter_user_id: string
          chat_thread_id: string | null
          closed_at: string | null
          closed_reason: string | null
          completed_milestones: Database["public"]["Enums"]["milestone_enum"][]
          confirmed_at: string | null
          created_at: string
          icon: string | null
          id: string
          listing_id: string
          new_home: string | null
          next_update_due_at: string | null
          pet_name: string
          poster_endorsed: boolean
          poster_recommendation:
            | Database["public"]["Enums"]["poster_recommendation_enum"]
            | null
          poster_user_id: string
          species: string | null
          status: Database["public"]["Enums"]["adoption_record_status_enum"]
          tint: string | null
        }
        Insert: {
          adopter_user_id: string
          chat_thread_id?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          completed_milestones?: Database["public"]["Enums"]["milestone_enum"][]
          confirmed_at?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          listing_id: string
          new_home?: string | null
          next_update_due_at?: string | null
          pet_name: string
          poster_endorsed?: boolean
          poster_recommendation?:
            | Database["public"]["Enums"]["poster_recommendation_enum"]
            | null
          poster_user_id: string
          species?: string | null
          status?: Database["public"]["Enums"]["adoption_record_status_enum"]
          tint?: string | null
        }
        Update: {
          adopter_user_id?: string
          chat_thread_id?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          completed_milestones?: Database["public"]["Enums"]["milestone_enum"][]
          confirmed_at?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          listing_id?: string
          new_home?: string | null
          next_update_due_at?: string | null
          pet_name?: string
          poster_endorsed?: boolean
          poster_recommendation?:
            | Database["public"]["Enums"]["poster_recommendation_enum"]
            | null
          poster_user_id?: string
          species?: string | null
          status?: Database["public"]["Enums"]["adoption_record_status_enum"]
          tint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adoption_records_adopter_user_id_fkey"
            columns: ["adopter_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "adoption_records_adopter_user_id_fkey"
            columns: ["adopter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_records_chat_thread_id_fkey"
            columns: ["chat_thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_records_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "adoption_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_records_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "adoption_records_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_requests: {
        Row: {
          id: string
          listing_id: string
          message: string | null
          poster_user_id: string
          requester_user_id: string
          status: Database["public"]["Enums"]["adoption_request_status_enum"]
          submitted_at: string
          thread_id: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          message?: string | null
          poster_user_id: string
          requester_user_id: string
          status?: Database["public"]["Enums"]["adoption_request_status_enum"]
          submitted_at?: string
          thread_id?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          message?: string | null
          poster_user_id?: string
          requester_user_id?: string
          status?: Database["public"]["Enums"]["adoption_request_status_enum"]
          submitted_at?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adoption_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "adoption_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_requests_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "adoption_requests_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "adoption_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_requests_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_update_media: {
        Row: {
          idx: number
          media_id: string
          update_id: string
        }
        Insert: {
          idx: number
          media_id: string
          update_id: string
        }
        Update: {
          idx?: number
          media_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_update_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_update_media_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "adoption_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_updates: {
        Row: {
          author_user_id: string
          created_at: string
          endorsement:
            | Database["public"]["Enums"]["poster_recommendation_enum"]
            | null
          has_video: boolean
          id: string
          milestone_id: Database["public"]["Enums"]["milestone_enum"] | null
          photo_count: number | null
          record_id: string
          text: string | null
          type: Database["public"]["Enums"]["adoption_update_type_enum"]
        }
        Insert: {
          author_user_id: string
          created_at?: string
          endorsement?:
            | Database["public"]["Enums"]["poster_recommendation_enum"]
            | null
          has_video?: boolean
          id?: string
          milestone_id?: Database["public"]["Enums"]["milestone_enum"] | null
          photo_count?: number | null
          record_id: string
          text?: string | null
          type: Database["public"]["Enums"]["adoption_update_type_enum"]
        }
        Update: {
          author_user_id?: string
          created_at?: string
          endorsement?:
            | Database["public"]["Enums"]["poster_recommendation_enum"]
            | null
          has_video?: boolean
          id?: string
          milestone_id?: Database["public"]["Enums"]["milestone_enum"] | null
          photo_count?: number | null
          record_id?: string
          text?: string | null
          type?: Database["public"]["Enums"]["adoption_update_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "adoption_updates_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "adoption_updates_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_updates_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "adoption_records"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_join_requests: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          note: string | null
          state: Database["public"]["Enums"]["request_state_enum"]
          user_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          note?: string | null
          state?: Database["public"]["Enums"]["request_state_enum"]
          user_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          note?: string | null
          state?: Database["public"]["Enums"]["request_state_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_join_requests_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean
          role: Database["public"]["Enums"]["member_role_enum"]
          user_id: string
        }
        Insert: {
          circle_id: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role?: Database["public"]["Enums"]["member_role_enum"]
          user_id: string
        }
        Update: {
          circle_id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role?: Database["public"]["Enums"]["member_role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_message_media: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          media_id: string | null
          message_id: string | null
          name: string | null
          size: string | null
          type: Database["public"]["Enums"]["shared_media_type_enum"]
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          media_id?: string | null
          message_id?: string | null
          name?: string | null
          size?: string | null
          type: Database["public"]["Enums"]["shared_media_type_enum"]
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          media_id?: string | null
          message_id?: string | null
          name?: string | null
          size?: string | null
          type?: Database["public"]["Enums"]["shared_media_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "circle_message_media_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_message_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_message_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "circle_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_messages: {
        Row: {
          circle_id: string
          created_at: string
          deleted_at: string | null
          id: string
          pinned: boolean
          sender_user_id: string | null
          shared_post_id: string | null
          text: string | null
          type: Database["public"]["Enums"]["circle_message_type_enum"]
        }
        Insert: {
          circle_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          pinned?: boolean
          sender_user_id?: string | null
          shared_post_id?: string | null
          text?: string | null
          type: Database["public"]["Enums"]["circle_message_type_enum"]
        }
        Update: {
          circle_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          pinned?: boolean
          sender_user_id?: string | null
          shared_post_id?: string | null
          text?: string | null
          type?: Database["public"]["Enums"]["circle_message_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "circle_messages_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circle_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          bio: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          icon: string | null
          icon_bg: string | null
          id: string
          location: string | null
          name: string
          privacy: Database["public"]["Enums"]["circle_privacy_enum"]
          slug: string | null
          tagline: string | null
          tags: string[]
          tint: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          icon?: string | null
          icon_bg?: string | null
          id?: string
          location?: string | null
          name: string
          privacy?: Database["public"]["Enums"]["circle_privacy_enum"]
          slug?: string | null
          tagline?: string | null
          tags?: string[]
          tint?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          icon?: string | null
          icon_bg?: string | null
          id?: string
          location?: string | null
          name?: string
          privacy?: Database["public"]["Enums"]["circle_privacy_enum"]
          slug?: string | null
          tagline?: string | null
          tags?: string[]
          tint?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "circles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          kind: Database["public"]["Enums"]["reaction_kind_enum"]
          user_id: string
        }
        Insert: {
          comment_id: string
          kind?: Database["public"]["Enums"]["reaction_kind_enum"]
          user_id: string
        }
        Update: {
          comment_id?: string
          kind?: Database["public"]["Enums"]["reaction_kind_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_user_id: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          text: string
        }
        Insert: {
          author_user_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          text: string
        }
        Update: {
          author_user_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          about: string | null
          allow_links: boolean
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          default_category: Database["public"]["Enums"]["community_category_enum"]
          discoverable: boolean
          enabled_topics: Database["public"]["Enums"]["community_category_enum"][]
          guidelines: string[]
          icon: string | null
          id: string
          join_policy: Database["public"]["Enums"]["join_policy_enum"]
          member_count: number
          members_only: boolean
          name: string
          post_approval: boolean
          require_photo_lost_found: boolean
          show_location: boolean
          tint: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          allow_links?: boolean
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          default_category?: Database["public"]["Enums"]["community_category_enum"]
          discoverable?: boolean
          enabled_topics?: Database["public"]["Enums"]["community_category_enum"][]
          guidelines?: string[]
          icon?: string | null
          id?: string
          join_policy?: Database["public"]["Enums"]["join_policy_enum"]
          member_count?: number
          members_only?: boolean
          name: string
          post_approval?: boolean
          require_photo_lost_found?: boolean
          show_location?: boolean
          tint?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          allow_links?: boolean
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          default_category?: Database["public"]["Enums"]["community_category_enum"]
          discoverable?: boolean
          enabled_topics?: Database["public"]["Enums"]["community_category_enum"][]
          guidelines?: string[]
          icon?: string | null
          id?: string
          join_policy?: Database["public"]["Enums"]["join_policy_enum"]
          member_count?: number
          members_only?: boolean
          name?: string
          post_approval?: boolean
          require_photo_lost_found?: boolean
          show_location?: boolean
          tint?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comment_helpful: {
        Row: {
          comment_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comment_helpful_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comment_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_comment_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_user_id: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          text: string
        }
        Insert: {
          author_user_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          text: string
        }
        Update: {
          author_user_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_join_requests: {
        Row: {
          community_id: string
          created_at: string
          id: string
          state: Database["public"]["Enums"]["request_state_enum"]
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          state?: Database["public"]["Enums"]["request_state_enum"]
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          state?: Database["public"]["Enums"]["request_state_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role_enum"]
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role_enum"]
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_companions: {
        Row: {
          companion_id: string
          post_id: string
        }
        Insert: {
          companion_id: string
          post_id: string
        }
        Update: {
          companion_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_companions_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_companions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_helpful: {
        Row: {
          post_id: string
          user_id: string
        }
        Insert: {
          post_id: string
          user_id: string
        }
        Update: {
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_helpful_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_post_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          alert_meta: Json | null
          approved: boolean
          author_user_id: string
          body: string
          category: Database["public"]["Enums"]["community_category_enum"]
          community_id: string
          composer_label:
            | Database["public"]["Enums"]["community_composer_enum"]
            | null
          created_at: string
          deleted_at: string | null
          id: string
          image_media_id: string | null
          image_tint: string | null
          title: string
          trending_score: number
        }
        Insert: {
          alert_meta?: Json | null
          approved?: boolean
          author_user_id: string
          body: string
          category: Database["public"]["Enums"]["community_category_enum"]
          community_id: string
          composer_label?:
            | Database["public"]["Enums"]["community_composer_enum"]
            | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_media_id?: string | null
          image_tint?: string | null
          title: string
          trending_score?: number
        }
        Update: {
          alert_meta?: Json | null
          approved?: boolean
          author_user_id?: string
          body?: string
          category?: Database["public"]["Enums"]["community_category_enum"]
          community_id?: string
          composer_label?:
            | Database["public"]["Enums"]["community_composer_enum"]
            | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_media_id?: string | null
          image_tint?: string | null
          title?: string
          trending_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_posts_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_followers: {
        Row: {
          companion_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_followers_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "companion_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companions: {
        Row: {
          about: string | null
          age: string | null
          avatar_media_id: string | null
          breed: string | null
          created_at: string
          deleted_at: string | null
          gender: string | null
          handle: string | null
          icon: string | null
          id: string
          microchipped: boolean
          mood: string | null
          name: string
          neutered: boolean
          owner_id: string
          pawprints: number
          species: Database["public"]["Enums"]["species_enum"]
          tint: string | null
          traits: string[]
          updated_at: string
          vaccinated: boolean
          verified: boolean
        }
        Insert: {
          about?: string | null
          age?: string | null
          avatar_media_id?: string | null
          breed?: string | null
          created_at?: string
          deleted_at?: string | null
          gender?: string | null
          handle?: string | null
          icon?: string | null
          id?: string
          microchipped?: boolean
          mood?: string | null
          name: string
          neutered?: boolean
          owner_id: string
          pawprints?: number
          species: Database["public"]["Enums"]["species_enum"]
          tint?: string | null
          traits?: string[]
          updated_at?: string
          vaccinated?: boolean
          verified?: boolean
        }
        Update: {
          about?: string | null
          age?: string | null
          avatar_media_id?: string | null
          breed?: string | null
          created_at?: string
          deleted_at?: string | null
          gender?: string | null
          handle?: string | null
          icon?: string | null
          id?: string
          microchipped?: boolean
          mood?: string | null
          name?: string
          neutered?: boolean
          owner_id?: string
          pawprints?: number
          species?: Database["public"]["Enums"]["species_enum"]
          tint?: string | null
          traits?: string[]
          updated_at?: string
          vaccinated?: boolean
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "companions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "companions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          bytes: number | null
          created_at: string
          duration_ms: number | null
          height: number | null
          id: string
          mime: string | null
          owner_id: string | null
          thumb_url: string | null
          type: Database["public"]["Enums"]["media_type_enum"]
          url: string
          width: number | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          mime?: string | null
          owner_id?: string | null
          thumb_url?: string | null
          type: Database["public"]["Enums"]["media_type_enum"]
          url: string
          width?: number | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          mime?: string | null
          owner_id?: string | null
          thumb_url?: string | null
          type?: Database["public"]["Enums"]["media_type_enum"]
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "media_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_media: {
        Row: {
          idx: number
          media_id: string
          message_id: string
        }
        Insert: {
          idx: number
          media_id: string
          message_id: string
        }
        Update: {
          idx?: number
          media_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          kind: Database["public"]["Enums"]["message_kind_enum"]
          record_id: string | null
          sender_user_id: string | null
          text: string | null
          thread_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind_enum"]
          record_id?: string | null
          sender_user_id?: string | null
          text?: string | null
          thread_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind_enum"]
          record_id?: string | null
          sender_user_id?: string | null
          text?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "adoption_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_user_id: string | null
          body: string | null
          created_at: string
          data: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          read: boolean
          recipient_id: string
          title: string | null
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          recipient_id: string
          title?: string | null
          type: string
        }
        Update: {
          actor_user_id?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          recipient_id?: string
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_alerts: {
        Row: {
          alert_radius_km: number
          alerted_count: number
          area: string | null
          found_at: string | null
          kind: Database["public"]["Enums"]["alert_kind_enum"]
          last_seen: string | null
          lat: number | null
          lng: number | null
          looks_like: string | null
          phone: string | null
          post_id: string
          resolved: boolean
        }
        Insert: {
          alert_radius_km?: number
          alerted_count?: number
          area?: string | null
          found_at?: string | null
          kind: Database["public"]["Enums"]["alert_kind_enum"]
          last_seen?: string | null
          lat?: number | null
          lng?: number | null
          looks_like?: string | null
          phone?: string | null
          post_id: string
          resolved?: boolean
        }
        Update: {
          alert_radius_km?: number
          alerted_count?: number
          area?: string | null
          found_at?: string | null
          kind?: Database["public"]["Enums"]["alert_kind_enum"]
          last_seen?: string | null
          lat?: number | null
          lng?: number | null
          looks_like?: string | null
          phone?: string | null
          post_id?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "post_alerts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_companions: {
        Row: {
          companion_id: string
          post_id: string
        }
        Insert: {
          companion_id: string
          post_id: string
        }
        Update: {
          companion_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_companions_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_companions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_forwards: {
        Row: {
          created_at: string
          destination_id: string | null
          destination_type: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_id?: string | null
          destination_type: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_id?: string | null
          destination_type?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_forwards_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_forwards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_forwards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          idx: number
          media_id: string
          post_id: string
        }
        Insert: {
          idx: number
          media_id: string
          post_id: string
        }
        Update: {
          idx?: number
          media_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          kind: Database["public"]["Enums"]["reaction_kind_enum"]
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind?: Database["public"]["Enums"]["reaction_kind_enum"]
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: Database["public"]["Enums"]["reaction_kind_enum"]
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          adoption_status:
            | Database["public"]["Enums"]["post_adoption_status_enum"]
            | null
          author_user_id: string
          circle_id: string | null
          companion_author_id: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_circle: boolean
          label: string | null
          location: string | null
          tag: Database["public"]["Enums"]["post_tag_enum"] | null
          text: string | null
        }
        Insert: {
          adoption_status?:
            | Database["public"]["Enums"]["post_adoption_status_enum"]
            | null
          author_user_id: string
          circle_id?: string | null
          companion_author_id?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_circle?: boolean
          label?: string | null
          location?: string | null
          tag?: Database["public"]["Enums"]["post_tag_enum"] | null
          text?: string | null
        }
        Update: {
          adoption_status?:
            | Database["public"]["Enums"]["post_adoption_status_enum"]
            | null
          author_user_id?: string
          circle_id?: string | null
          companion_author_id?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_circle?: boolean
          label?: string | null
          location?: string | null
          tag?: Database["public"]["Enums"]["post_tag_enum"] | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_companion_author_id_fkey"
            columns: ["companion_author_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_user_id: string
          state: Database["public"]["Enums"]["report_state_enum"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_enum"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          state?: Database["public"]["Enums"]["report_state_enum"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_enum"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          state?: Database["public"]["Enums"]["report_state_enum"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rescue_help_offers: {
        Row: {
          id: string
          case_id: string
          helper_user_id: string
          type: string
          message: string | null
          status: string
          reviewed_by_user_id: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          helper_user_id: string
          type: string
          message?: string | null
          status?: string
          reviewed_by_user_id?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          helper_user_id?: string
          type?: string
          message?: string | null
          status?: string
          reviewed_by_user_id?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescue_help_offers_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "rescue_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescue_help_offers_helper_user_id_fkey"
            columns: ["helper_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rescue_case_followers: {
        Row: {
          case_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescue_case_followers_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "rescue_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescue_case_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rescue_case_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rescue_cases: {
        Row: {
          case_code: string | null
          created_at: string
          deleted_at: string | null
          headline: string | null
          icon: string | null
          id: string
          location: string | null
          name: string
          post_id: string | null
          poster_user_id: string
          species: Database["public"]["Enums"]["species_enum"]
          status: Database["public"]["Enums"]["rescue_status_enum"]
          story: string | null
          tags: string[]
          tint: string | null
          updated_at: string
        }
        Insert: {
          case_code?: string | null
          created_at?: string
          deleted_at?: string | null
          headline?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          name: string
          post_id?: string | null
          poster_user_id: string
          species: Database["public"]["Enums"]["species_enum"]
          status?: Database["public"]["Enums"]["rescue_status_enum"]
          story?: string | null
          tags?: string[]
          tint?: string | null
          updated_at?: string
        }
        Update: {
          case_code?: string | null
          created_at?: string
          deleted_at?: string | null
          headline?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          name?: string
          post_id?: string | null
          poster_user_id?: string
          species?: Database["public"]["Enums"]["species_enum"]
          status?: Database["public"]["Enums"]["rescue_status_enum"]
          story?: string | null
          tags?: string[]
          tint?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescue_cases_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescue_cases_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rescue_cases_poster_user_id_fkey"
            columns: ["poster_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rescue_update_media: {
        Row: {
          idx: number
          media_id: string
          update_id: string
        }
        Insert: {
          idx: number
          media_id: string
          update_id: string
        }
        Update: {
          idx?: number
          media_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescue_update_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescue_update_media_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "rescue_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      rescue_updates: {
        Row: {
          case_id: string
          created_at: string
          has_video: boolean
          id: string
          photo_count: number
          text: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          has_video?: boolean
          id?: string
          photo_count?: number
          text?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          has_video?: boolean
          id?: string
          photo_count?: number
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rescue_updates_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "rescue_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          rating: number
          subject_user_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          rating: number
          subject_user_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          rating?: number
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          item_id: string
          item_type: Database["public"]["Enums"]["saved_item_type_enum"]
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          item_type: Database["public"]["Enums"]["saved_item_type_enum"]
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          item_type?: Database["public"]["Enums"]["saved_item_type_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_participants: {
        Row: {
          last_read_message_id: string | null
          muted: boolean
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_message_id?: string | null
          muted?: boolean
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_message_id?: string | null
          muted?: boolean
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "thread_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          adoption_listing_id: string | null
          adoption_record_id: string | null
          created_at: string
          id: string
          type: Database["public"]["Enums"]["thread_type_enum"]
          updated_at: string
        }
        Insert: {
          adoption_listing_id?: string | null
          adoption_record_id?: string | null
          created_at?: string
          id?: string
          type?: Database["public"]["Enums"]["thread_type_enum"]
          updated_at?: string
        }
        Update: {
          adoption_listing_id?: string | null
          adoption_record_id?: string | null
          created_at?: string
          id?: string
          type?: Database["public"]["Enums"]["thread_type_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_adoption_listing_id_fkey"
            columns: ["adoption_listing_id"]
            isOneToOne: false
            referencedRelation: "adoption_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_adoption_record_fk"
            columns: ["adoption_record_id"]
            isOneToOne: false
            referencedRelation: "adoption_records"
            referencedColumns: ["id"]
          },
        ]
      }
      treat_gifts: {
        Row: {
          amount: number
          companion_id: string
          created_at: string
          from_user_id: string
          id: string
          owner_id: string
        }
        Insert: {
          amount?: number
          companion_id: string
          created_at?: string
          from_user_id: string
          id?: string
          owner_id: string
        }
        Update: {
          amount?: number
          companion_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treat_gifts_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treat_gifts_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "treat_gifts_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treat_gifts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "treat_gifts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      treat_wallets: {
        Row: {
          allowance: number
          period_start_at: string
          remaining: number
          user_id: string
        }
        Insert: {
          allowance?: number
          period_start_at?: string
          remaining?: number
          user_id: string
        }
        Update: {
          allowance?: number
          period_start_at?: string
          remaining?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treat_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "treat_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_privacy_settings: {
        Row: {
          discoverable: boolean
          message_policy: Database["public"]["Enums"]["message_policy_enum"]
          notify_adoption_updates: boolean
          notify_post_activity: boolean
          post_visibility: Database["public"]["Enums"]["profile_visibility_enum"]
          profile_visibility: Database["public"]["Enums"]["profile_visibility_enum"]
          show_companions: boolean
          show_location: boolean
          show_online: boolean
          show_treats_on_profile: boolean
          user_id: string
        }
        Insert: {
          discoverable?: boolean
          message_policy?: Database["public"]["Enums"]["message_policy_enum"]
          notify_adoption_updates?: boolean
          notify_post_activity?: boolean
          post_visibility?: Database["public"]["Enums"]["profile_visibility_enum"]
          profile_visibility?: Database["public"]["Enums"]["profile_visibility_enum"]
          show_companions?: boolean
          show_location?: boolean
          show_online?: boolean
          show_treats_on_profile?: boolean
          user_id: string
        }
        Update: {
          discoverable?: boolean
          message_policy?: Database["public"]["Enums"]["message_policy_enum"]
          notify_adoption_updates?: boolean
          notify_post_activity?: boolean
          post_visibility?: Database["public"]["Enums"]["profile_visibility_enum"]
          profile_visibility?: Database["public"]["Enums"]["profile_visibility_enum"]
          show_companions?: boolean
          show_location?: boolean
          show_online?: boolean
          show_treats_on_profile?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profile_trust"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_media_id: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          handle: string
          id: string
          joined_at: string
          location: string | null
          location_lat: number | null
          location_lng: number | null
          location_updated_at: string | null
          name: string
          online_last_seen: string | null
          phone: string | null
          tint: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          avatar_media_id?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          handle: string
          id: string
          joined_at?: string
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_updated_at?: string | null
          name: string
          online_last_seen?: string | null
          phone?: string | null
          tint?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          avatar_media_id?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          handle?: string
          id?: string
          joined_at?: string
          location?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_updated_at?: string | null
          name?: string
          online_last_seen?: string | null
          phone?: string | null
          tint?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      profile_trust: {
        Row: {
          flag_count: number | null
          rating: number | null
          review_count: number | null
          status:
            | Database["public"]["Enums"]["profile_trust_status_enum"]
            | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_circle_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      accept_community_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      adopter_respond: {
        Args: { p_record_id: string; p_text: string }
        Returns: undefined
      }
      approve_adoption_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      confirm_adoption: { Args: { p_record_id: string }; Returns: undefined }
      create_circle: {
        Args: {
          p_location: string
          p_name: string
          p_privacy?: Database["public"]["Enums"]["circle_privacy_enum"]
        }
        Returns: Json
      }
      create_community: {
        Args: {
          p_about: string
          p_default_category?: Database["public"]["Enums"]["community_category_enum"]
          p_discoverable?: boolean
          p_guidelines?: string
          p_icon: string
          p_join_policy?: Database["public"]["Enums"]["join_policy_enum"]
          p_members_only?: boolean
          p_name: string
          p_tint: string
        }
        Returns: string
      }
      decline_circle_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      decline_community_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      do_milestone_sweep: { Args: never; Returns: number }
      endorse_adopter: {
        Args: { p_recommendation: string; p_record_id: string; p_text?: string }
        Returns: undefined
      }
      fan_out_post_alert: {
        Args: { p_post_id: string }
        Returns: Json
      }
      fan_out_my_post_alert: {
        Args: { p_post_id: string }
        Returns: Json
      }
      get_adopter_public_flags: {
        Args: { p_user_ids: string[] }
        Returns: {
          trust_flag: string | null
          update_requested: boolean
          user_id: string
        }[]
      }
      get_public_treat_wallets_remaining: {
        Args: { p_user_ids: string[] }
        Returns: {
          remaining: number
          user_id: string
        }[]
      }
      give_treat: { Args: { p_companion_id: string }; Returns: Json }
      is_circle_admin: { Args: { p_circle: string }; Returns: boolean }
      is_circle_member: { Args: { p_circle: string }; Returns: boolean }
      is_community_admin: { Args: { p_community: string }; Returns: boolean }
      is_community_member: { Args: { p_community: string }; Returns: boolean }
      join_circle: { Args: { p_circle_id: string }; Returns: undefined }
      join_community: { Args: { p_community: string }; Returns: undefined }
      leave_circle: { Args: { p_circle_id: string }; Returns: undefined }
      leave_community: { Args: { p_community: string }; Returns: undefined }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_thread_read: {
        Args: { p_message_id: string; p_thread_id: string }
        Returns: undefined
      }
      post_adoption_update: {
        Args: {
          p_has_video?: boolean
          p_milestone_id?: string
          p_photo_count?: number
          p_record_id: string
          p_text?: string
          p_type: string
        }
        Returns: string
      }
      propose_adoption: {
        Args: {
          p_adopter_user_id: string
          p_icon: string
          p_listing_id: string
          p_pet_name: string
          p_species: string
          p_thread_id?: string
          p_tint: string
        }
        Returns: string
      }
      reject_adoption_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      resolve_post_alert: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      remove_community_member: {
        Args: { p_community: string; p_user: string }
        Returns: undefined
      }
      send_circle_request: {
        Args: { p_circle_id: string; p_note?: string }
        Returns: string
      }
      send_community_request: {
        Args: { p_community: string }
        Returns: undefined
      }
      set_post_alert_coordinates: {
        Args: {
          p_lat: number
          p_lng: number
          p_post_id: string
          p_radius_km?: number
        }
        Returns: undefined
      }
      start_dm: { Args: { p_other_user_id: string }; Returns: string }
      toggle_thread_mute: { Args: { p_thread_id: string }; Returns: boolean }
      update_user_location: {
        Args: { p_lat: number; p_lng: number }
        Returns: undefined
      }
      update_community_settings: {
        Args: {
          p_about?: string
          p_allow_links?: boolean
          p_community: string
          p_default_category?: Database["public"]["Enums"]["community_category_enum"]
          p_discoverable?: boolean
          p_guidelines?: string
          p_icon?: string
          p_join_policy?: Database["public"]["Enums"]["join_policy_enum"]
          p_members_only?: boolean
          p_name?: string
          p_post_approval?: boolean
          p_tint?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      adopter_trust_badge_enum: "trusted" | "active" | "new" | "update_pending"
      adoption_listing_status_enum: "Available" | "Urgent" | "Adopted"
      adoption_record_status_enum:
        | "pending_confirmation"
        | "confirmed"
        | "update_due"
        | "closed"
      adoption_request_status_enum:
        | "submitted"
        | "approved"
        | "rejected"
        | "adopted"
      adoption_update_type_enum:
        | "adopter_home"
        | "poster_placement"
        | "poster_endorsement"
        | "adopter_response"
      age_group_enum: "puppy-kitten" | "young" | "adult" | "senior"
      alert_kind_enum: "lost" | "found"
      circle_message_type_enum: "text" | "system" | "media" | "shared_post"
      circle_privacy_enum: "open" | "request"
      community_category_enum:
        | "general"
        | "rescue"
        | "health"
        | "lost-found"
        | "tips"
        | "events"
      community_composer_enum:
        | "discussion"
        | "lost"
        | "found"
        | "rescue"
        | "meme"
      gender_enum: "Male" | "Female"
      join_policy_enum: "open" | "request" | "invite"
      media_type_enum: "image" | "video" | "file"
      member_role_enum: "admin" | "member"
      message_kind_enum: "text" | "system" | "update_request"
      message_policy_enum: "everyone" | "circles" | "none"
      milestone_enum: "week_1" | "month_1" | "month_3" | "month_6"
      post_adoption_status_enum: "open" | "adopted"
      post_tag_enum:
        | "discussion"
        | "adoption"
        | "lost-found"
        | "rescue"
        | "paw-posting"
        | "meme"
      poster_recommendation_enum: "recommended" | "not_recommended"
      profile_trust_status_enum: "trusted" | "good" | "warning" | "flagged"
      profile_visibility_enum: "everyone" | "circles" | "only_me"
      reaction_kind_enum: "paw"
      report_state_enum: "open" | "reviewing" | "actioned" | "dismissed"
      report_target_enum:
        | "user"
        | "post"
        | "community_post"
        | "circle"
        | "message"
      request_state_enum: "pending" | "approved" | "rejected"
      rescue_status_enum: "active" | "under_treatment" | "recovered"
      saved_item_type_enum: "feed_post" | "community_post"
      shared_media_type_enum: "photo" | "file"
      species_enum: "dog" | "cat" | "other"
      thread_type_enum: "dm" | "adoption"
      vaccination_enum: "Done" | "Partial" | "Not yet"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      adopter_trust_badge_enum: ["trusted", "active", "new", "update_pending"],
      adoption_listing_status_enum: ["Available", "Urgent", "Adopted"],
      adoption_record_status_enum: [
        "pending_confirmation",
        "confirmed",
        "update_due",
        "closed",
      ],
      adoption_request_status_enum: [
        "submitted",
        "approved",
        "rejected",
        "adopted",
      ],
      adoption_update_type_enum: [
        "adopter_home",
        "poster_placement",
        "poster_endorsement",
        "adopter_response",
      ],
      age_group_enum: ["puppy-kitten", "young", "adult", "senior"],
      alert_kind_enum: ["lost", "found"],
      circle_message_type_enum: ["text", "system", "media", "shared_post"],
      circle_privacy_enum: ["open", "request"],
      community_category_enum: [
        "general",
        "rescue",
        "health",
        "lost-found",
        "tips",
        "events",
      ],
      community_composer_enum: [
        "discussion",
        "lost",
        "found",
        "rescue",
        "meme",
      ],
      gender_enum: ["Male", "Female"],
      join_policy_enum: ["open", "request", "invite"],
      media_type_enum: ["image", "video", "file"],
      member_role_enum: ["admin", "member"],
      message_kind_enum: ["text", "system", "update_request"],
      message_policy_enum: ["everyone", "circles", "none"],
      milestone_enum: ["week_1", "month_1", "month_3", "month_6"],
      post_adoption_status_enum: ["open", "adopted"],
      post_tag_enum: [
        "discussion",
        "adoption",
        "lost-found",
        "rescue",
        "paw-posting",
        "meme",
      ],
      poster_recommendation_enum: ["recommended", "not_recommended"],
      profile_trust_status_enum: ["trusted", "good", "warning", "flagged"],
      profile_visibility_enum: ["everyone", "circles", "only_me"],
      reaction_kind_enum: ["paw"],
      report_state_enum: ["open", "reviewing", "actioned", "dismissed"],
      report_target_enum: [
        "user",
        "post",
        "community_post",
        "circle",
        "message",
      ],
      request_state_enum: ["pending", "approved", "rejected"],
      rescue_status_enum: ["active", "under_treatment", "recovered"],
      saved_item_type_enum: ["feed_post", "community_post"],
      shared_media_type_enum: ["photo", "file"],
      species_enum: ["dog", "cat", "other"],
      thread_type_enum: ["dm", "adoption"],
      vaccination_enum: ["Done", "Partial", "Not yet"],
    },
  },
} as const
