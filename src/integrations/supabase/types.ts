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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      boost_payments: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          id: string
          media_id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          phone_number: string
          status: string
          transaction_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          media_id: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number: string
          status?: string
          transaction_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          media_id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number?: string
          status?: string
          transaction_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "media_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          media_id: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          media_id?: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          media_id?: string | null
          participant_1_id?: string
          participant_2_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: Database["public"]["Enums"]["friend_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["friend_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["friend_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id_1: string
          user_id_2: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      idemark_records: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          fingerprint_hash: string
          id: string
          idemark_id: string
          is_title_public: boolean
          marked_at: string
          media_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          fingerprint_hash: string
          id?: string
          idemark_id: string
          is_title_public?: boolean
          marked_at?: string
          media_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          fingerprint_hash?: string
          id?: string
          idemark_id?: string
          is_title_public?: boolean
          marked_at?: string
          media_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idemark_records_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      idescan_scans: {
        Row: {
          created_at: string | null
          description: string
          id: string
          image_embedding: string | null
          image_url: string | null
          metadata: Json | null
          status: string
          text_embedding: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          image_embedding?: string | null
          image_url?: string | null
          metadata?: Json | null
          status?: string
          text_embedding?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          image_embedding?: string | null
          image_url?: string | null
          metadata?: Json | null
          status?: string
          text_embedding?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      innovation_records: {
        Row: {
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          image_embedding: string | null
          legal_status: string | null
          metadata: Json | null
          owner: string | null
          patent_number: string | null
          publication_date: string | null
          source_type: string
          source_url: string | null
          tags: string[] | null
          text_embedding: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_embedding?: string | null
          legal_status?: string | null
          metadata?: Json | null
          owner?: string | null
          patent_number?: string | null
          publication_date?: string | null
          source_type: string
          source_url?: string | null
          tags?: string[] | null
          text_embedding?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_embedding?: string | null
          legal_status?: string | null
          metadata?: Json | null
          owner?: string | null
          patent_number?: string | null
          publication_date?: string | null
          source_type?: string
          source_url?: string | null
          tags?: string[] | null
          text_embedding?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      live_link_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_link_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "live_link_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      live_link_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          live_link_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          live_link_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          live_link_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_link_comments_live_link_id_fkey"
            columns: ["live_link_id"]
            isOneToOne: false
            referencedRelation: "live_links"
            referencedColumns: ["id"]
          },
        ]
      }
      live_link_likes: {
        Row: {
          created_at: string
          id: string
          live_link_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_link_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_link_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_link_likes_live_link_id_fkey"
            columns: ["live_link_id"]
            isOneToOne: false
            referencedRelation: "live_links"
            referencedColumns: ["id"]
          },
        ]
      }
      live_link_saves: {
        Row: {
          created_at: string
          id: string
          live_link_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_link_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_link_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_link_saves_live_link_id_fkey"
            columns: ["live_link_id"]
            isOneToOne: false
            referencedRelation: "live_links"
            referencedColumns: ["id"]
          },
        ]
      }
      live_links: {
        Row: {
          category: string | null
          comments_count: number
          created_at: string
          description: string | null
          id: string
          likes_count: number
          saves_count: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number
          website_url: string
        }
        Insert: {
          category?: string | null
          comments_count?: number
          created_at?: string
          description?: string | null
          id?: string
          likes_count?: number
          saves_count?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number
          website_url: string
        }
        Update: {
          category?: string | null
          comments_count?: number
          created_at?: string
          description?: string | null
          id?: string
          likes_count?: number
          saves_count?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number
          website_url?: string
        }
        Relationships: []
      }
      media_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          media_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          media_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          media_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_comments_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      media_likes: {
        Row: {
          created_at: string
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_likes_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      media_saves: {
        Row: {
          created_at: string
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: []
      }
      media_uploads: {
        Row: {
          boost_expires_at: string | null
          category: string | null
          comments_count: number
          created_at: string
          demo_url: string | null
          description: string | null
          file_size: number | null
          funding_amount: number | null
          id: string
          investment_stage: string | null
          investment_status: string | null
          is_boosted: boolean
          likes_count: number
          media_type: string
          media_url: string
          mime_type: string | null
          pitch_summary: string | null
          saves_count: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number
        }
        Insert: {
          boost_expires_at?: string | null
          category?: string | null
          comments_count?: number
          created_at?: string
          demo_url?: string | null
          description?: string | null
          file_size?: number | null
          funding_amount?: number | null
          id?: string
          investment_stage?: string | null
          investment_status?: string | null
          is_boosted?: boolean
          likes_count?: number
          media_type: string
          media_url: string
          mime_type?: string | null
          pitch_summary?: string | null
          saves_count?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number
        }
        Update: {
          boost_expires_at?: string | null
          category?: string | null
          comments_count?: number
          created_at?: string
          demo_url?: string | null
          description?: string | null
          file_size?: number | null
          funding_amount?: number | null
          id?: string
          investment_stage?: string | null
          investment_status?: string | null
          is_boosted?: boolean
          likes_count?: number
          media_type?: string
          media_url?: string
          mime_type?: string | null
          pitch_summary?: string | null
          saves_count?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      media_views: {
        Row: {
          created_at: string
          id: string
          media_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          content: string | null
          created_at: string
          id: string
          media_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          content?: string | null
          created_at?: string
          id?: string
          media_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          content?: string | null
          created_at?: string
          id?: string
          media_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pitch_decks: {
        Row: {
          category: string | null
          created_at: string
          id: string
          idea_id: string | null
          image_url: string | null
          is_public: boolean
          monetization: string | null
          sections: Json
          share_token: string | null
          target_audience: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          idea_id?: string | null
          image_url?: string | null
          is_public?: boolean
          monetization?: string | null
          sections?: Json
          share_token?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          idea_id?: string | null
          image_url?: string | null
          is_public?: boolean
          monetization?: string | null
          sections?: Json
          share_token?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          amount: number
          api_key: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          intasend_invoice_id: string | null
          payment_reference: string | null
          plan_type: string
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          api_key?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          intasend_invoice_id?: string | null
          payment_reference?: string | null
          plan_type: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          api_key?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          intasend_invoice_id?: string | null
          payment_reference?: string | null
          plan_type?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          following_private: boolean | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          social_links: Json | null
          updated_at: string
          user_id: string
          username: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          following_private?: boolean | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          social_links?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          following_private?: boolean | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          social_links?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      scan_results: {
        Row: {
          created_at: string | null
          id: string
          image_similarity: number | null
          innovation_id: string
          metadata_similarity: number | null
          scan_id: string
          similarity_score: number
          similarity_tier: string
          text_similarity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_similarity?: number | null
          innovation_id: string
          metadata_similarity?: number | null
          scan_id: string
          similarity_score: number
          similarity_tier: string
          text_similarity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_similarity?: number | null
          innovation_id?: string
          metadata_similarity?: number | null
          scan_id?: string
          similarity_score?: number
          similarity_tier?: string
          text_similarity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_results_innovation_id_fkey"
            columns: ["innovation_id"]
            isOneToOne: false
            referencedRelation: "innovation_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_results_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "idescan_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_news_posts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          published_for: string
          source_name: string | null
          source_url: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          published_for?: string
          source_name?: string | null
          source_url: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          published_for?: string
          source_name?: string | null
          source_url?: string
          title?: string
        }
        Relationships: []
      }
      unlocked_innovations: {
        Row: {
          amount: number
          created_at: string
          id: string
          innovation_id: string
          payment_reference: string
          scan_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          innovation_id: string
          payment_reference: string
          scan_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          innovation_id?: string
          payment_reference?: string
          scan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_innovations_innovation_id_fkey"
            columns: ["innovation_id"]
            isOneToOne: false
            referencedRelation: "innovation_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unlocked_innovations_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "idescan_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscription_tiers: {
        Row: {
          created_at: string
          id: string
          max_watched_websites: number | null
          scan_frequency: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_watched_websites?: number | null
          scan_frequency?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_watched_websites?: number | null
          scan_frequency?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watched_website_changes: {
        Row: {
          change_summary: string
          change_type: string
          detected_at: string
          id: string
          new_content: string | null
          previous_content: string | null
          watched_website_id: string
        }
        Insert: {
          change_summary: string
          change_type: string
          detected_at?: string
          id?: string
          new_content?: string | null
          previous_content?: string | null
          watched_website_id: string
        }
        Update: {
          change_summary?: string
          change_type?: string
          detected_at?: string
          id?: string
          new_content?: string | null
          previous_content?: string | null
          watched_website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watched_website_changes_watched_website_id_fkey"
            columns: ["watched_website_id"]
            isOneToOne: false
            referencedRelation: "watched_websites"
            referencedColumns: ["id"]
          },
        ]
      }
      watched_websites: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_pinned: boolean | null
          last_checked_at: string | null
          last_content_hash: string | null
          name: string
          scan_id: string | null
          similarity_score: number | null
          update_status: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          last_checked_at?: string | null
          last_content_hash?: string | null
          name: string
          scan_id?: string | null
          similarity_score?: number | null
          update_status?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          last_checked_at?: string | null
          last_content_hash?: string | null
          name?: string
          scan_id?: string | null
          similarity_score?: number | null
          update_status?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watched_websites_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "idescan_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      webscan_subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          payment_reference: string
          paystack_reference: string | null
          plan_type: string
          scan_id: string | null
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          payment_reference: string
          paystack_reference?: string | null
          plan_type: string
          scan_id?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string
          paystack_reference?: string | null
          plan_type?: string
          scan_id?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webscan_subscriptions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "idescan_scans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_similarity_tier: { Args: { score: number }; Returns: string }
      create_notification: {
        Args: {
          actor_id: string
          comment_content?: string
          media_id?: string
          notification_type: string
          recipient_id: string
        }
        Returns: undefined
      }
      decrement_comment_likes_count: {
        Args: { comment_id: string }
        Returns: undefined
      }
      decrement_likes_count: { Args: { media_id: string }; Returns: undefined }
      decrement_live_link_comment_likes: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      decrement_live_link_likes: {
        Args: { link_id: string }
        Returns: undefined
      }
      decrement_live_link_saves: {
        Args: { link_id: string }
        Returns: undefined
      }
      decrement_saves_count: { Args: { media_id: string }; Returns: undefined }
      get_follower_count: { Args: { profile_user_id: string }; Returns: number }
      get_following_count: {
        Args: { profile_user_id: string }
        Returns: number
      }
      get_investment_ready_count: {
        Args: { profile_user_id: string }
        Returns: number
      }
      get_media_count: { Args: { profile_user_id: string }; Returns: number }
      get_total_likes_count: {
        Args: { profile_user_id: string }
        Returns: number
      }
      get_video_count: { Args: { profile_user_id: string }; Returns: number }
      increment_comment_count: {
        Args: { media_id: string }
        Returns: undefined
      }
      increment_comment_likes_count: {
        Args: { comment_id: string }
        Returns: undefined
      }
      increment_likes_count: { Args: { media_id: string }; Returns: undefined }
      increment_live_link_comment_likes: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      increment_live_link_comments: {
        Args: { link_id: string }
        Returns: undefined
      }
      increment_live_link_likes: {
        Args: { link_id: string }
        Returns: undefined
      }
      increment_live_link_saves: {
        Args: { link_id: string }
        Returns: undefined
      }
      increment_saves_count: { Args: { media_id: string }; Returns: undefined }
      increment_view_count: {
        Args: { media_id: string; viewer_ip?: string; viewer_user_id?: string }
        Returns: undefined
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_creator: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      friend_request_status: "pending" | "accepted" | "rejected"
      group_role: "admin" | "member"
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
  public: {
    Enums: {
      friend_request_status: ["pending", "accepted", "rejected"],
      group_role: ["admin", "member"],
    },
  },
} as const
