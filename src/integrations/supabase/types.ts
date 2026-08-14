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
  public: {
    Tables: {
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          commission_cents: number
          comprovante_nome: string | null
          comprovante_path: string | null
          course_title: string | null
          created_at: string
          enrollment_id: string | null
          id: string
          installment_id: string | null
          notes: string | null
          paid_at: string | null
          parcela_label: string | null
          status: string
          student_name: string | null
          valor_cents: number
        }
        Insert: {
          affiliate_id: string
          commission_cents?: number
          comprovante_nome?: string | null
          comprovante_path?: string | null
          course_title?: string | null
          created_at?: string
          enrollment_id?: string | null
          id?: string
          installment_id?: string | null
          notes?: string | null
          paid_at?: string | null
          parcela_label?: string | null
          status?: string
          student_name?: string | null
          valor_cents?: number
        }
        Update: {
          affiliate_id?: string
          commission_cents?: number
          comprovante_nome?: string | null
          comprovante_path?: string | null
          course_title?: string | null
          created_at?: string
          enrollment_id?: string | null
          id?: string
          installment_id?: string | null
          notes?: string | null
          paid_at?: string | null
          parcela_label?: string | null
          status?: string
          student_name?: string | null
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          code: string
          commission_pct: number
          created_at: string
          id: string
          notes: string | null
          pix_key: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          commission_pct?: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          commission_pct?: number
          created_at?: string
          id?: string
          notes?: string | null
          pix_key?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          carga_horaria: string | null
          course_id: string
          created_at: string
          emitido_em: string
          emitido_por: string | null
          id: string
          nota_final: number | null
          numero: string
          observacoes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carga_horaria?: string | null
          course_id: string
          created_at?: string
          emitido_em?: string
          emitido_por?: string | null
          id?: string
          nota_final?: number | null
          numero: string
          observacoes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carga_horaria?: string | null
          course_id?: string
          created_at?: string
          emitido_em?: string
          emitido_por?: string | null
          id?: string
          nota_final?: number | null
          numero?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          facebook: string | null
          id: string
          inscricao_estadual: string | null
          instagram: string | null
          linkedin: string | null
          logo_url: string | null
          nome_fantasia: string | null
          razao_social: string | null
          responsavel_cargo: string | null
          responsavel_nome: string | null
          singleton: boolean
          site: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          facebook?: string | null
          id?: string
          inscricao_estadual?: string | null
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          singleton?: boolean
          site?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          facebook?: string | null
          id?: string
          inscricao_estadual?: string | null
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          responsavel_cargo?: string | null
          responsavel_nome?: string | null
          singleton?: boolean
          site?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      connect_api_config: {
        Row: {
          business_account_id: string | null
          created_at: string
          id: string
          numero: string | null
          phone_number_id: string | null
          provider: string
          status: string
          token_set: boolean
          updated_at: string
          webhook_verify_token: string | null
        }
        Insert: {
          business_account_id?: string | null
          created_at?: string
          id?: string
          numero?: string | null
          phone_number_id?: string | null
          provider?: string
          status?: string
          token_set?: boolean
          updated_at?: string
          webhook_verify_token?: string | null
        }
        Update: {
          business_account_id?: string | null
          created_at?: string
          id?: string
          numero?: string | null
          phone_number_id?: string | null
          provider?: string
          status?: string
          token_set?: boolean
          updated_at?: string
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      connect_campaign_attachments: {
        Row: {
          campaign_id: string
          created_at: string
          file_path: string | null
          id: string
          mime: string | null
          nome: string | null
          size_bytes: number | null
          url: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          mime?: string | null
          nome?: string | null
          size_bytes?: number | null
          url?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          mime?: string | null
          nome?: string | null
          size_bytes?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connect_campaign_attachments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "connect_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_campaign_messages: {
        Row: {
          agendada_para: string | null
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          enviada_em: string | null
          erro: string | null
          id: string
          mensagem: string | null
          status: string
          tentativas: number
          variant_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          agendada_para?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          enviada_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string | null
          status?: string
          tentativas?: number
          variant_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          agendada_para?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          enviada_em?: string | null
          erro?: string | null
          id?: string
          mensagem?: string | null
          status?: string
          tentativas?: number
          variant_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connect_campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "connect_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connect_campaign_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "connect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connect_campaign_messages_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "connect_campaign_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_campaign_variants: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          mensagem: string
          ordem: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          mensagem?: string
          ordem?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          mensagem?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "connect_campaign_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "connect_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_campaigns: {
        Row: {
          concluido_em: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          dias_semana: number[]
          etiquetas: string[]
          filtros: Json
          horarios: string[]
          id: string
          iniciado_em: string | null
          intervalo_max: number
          intervalo_min: number
          mensagem: string | null
          nome: string
          pausa_apos_msgs: number
          pausa_minutos: number
          recorrencia: string
          status: string
          tipo_publico: string
          total_destinatarios: number
          total_enviadas: number
          total_falhas: number
          updated_at: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          dias_semana?: number[]
          etiquetas?: string[]
          filtros?: Json
          horarios?: string[]
          id?: string
          iniciado_em?: string | null
          intervalo_max?: number
          intervalo_min?: number
          mensagem?: string | null
          nome: string
          pausa_apos_msgs?: number
          pausa_minutos?: number
          recorrencia?: string
          status?: string
          tipo_publico?: string
          total_destinatarios?: number
          total_enviadas?: number
          total_falhas?: number
          updated_at?: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          dias_semana?: number[]
          etiquetas?: string[]
          filtros?: Json
          horarios?: string[]
          id?: string
          iniciado_em?: string | null
          intervalo_max?: number
          intervalo_min?: number
          mensagem?: string | null
          nome?: string
          pausa_apos_msgs?: number
          pausa_minutos?: number
          recorrencia?: string
          status?: string
          tipo_publico?: string
          total_destinatarios?: number
          total_enviadas?: number
          total_falhas?: number
          updated_at?: string
        }
        Relationships: []
      }
      connect_contact_tags: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      connect_contacts: {
        Row: {
          cidade: string | null
          created_at: string
          created_by: string | null
          email: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          opt_out: boolean
          origem: string | null
          stage_id: string | null
          stage_ordem: number
          status: string
          tags: string[]
          tipo: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          opt_out?: boolean
          origem?: string | null
          stage_id?: string | null
          stage_ordem?: number
          status?: string
          tags?: string[]
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          opt_out?: boolean
          origem?: string | null
          stage_id?: string | null
          stage_ordem?: number
          status?: string
          tags?: string[]
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connect_contacts_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "connect_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_pipeline_stages: {
        Row: {
          cor: string
          created_at: string
          id: string
          is_final: boolean
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          is_final?: boolean
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          is_final?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      contas_comerciais: {
        Row: {
          atualizado_em: string
          configuracoes: Json
          criado_em: string
          criado_por: string | null
          documento_fiscal: string | null
          email_contato: string | null
          id: string
          nome: string
          parent_id: string | null
          slug: string
          status: string
          telefone_contato: string | null
          tipo_da_conta: string
        }
        Insert: {
          atualizado_em?: string
          configuracoes?: Json
          criado_em?: string
          criado_por?: string | null
          documento_fiscal?: string | null
          email_contato?: string | null
          id?: string
          nome: string
          parent_id?: string | null
          slug: string
          status?: string
          telefone_contato?: string | null
          tipo_da_conta?: string
        }
        Update: {
          atualizado_em?: string
          configuracoes?: Json
          criado_em?: string
          criado_por?: string | null
          documento_fiscal?: string | null
          email_contato?: string | null
          id?: string
          nome?: string
          parent_id?: string | null
          slug?: string
          status?: string
          telefone_contato?: string | null
          tipo_da_conta?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_comerciais_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          content: Json
          created_at: string
          duration_seconds: number | null
          id: string
          lesson_type: string
          passing_score: number
          section_id: string
          sort_order: number
          title: string
          updated_at: string
          video_path: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_type: string
          passing_score?: number
          section_id: string
          sort_order?: number
          title: string
          updated_at?: string
          video_path?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lesson_type?: string
          passing_score?: number
          section_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          active: boolean
          categoria_id: string | null
          category: string
          coursebox_embed_url: string | null
          created_at: string
          description: string | null
          duration: string | null
          external_url: string | null
          featured: boolean
          has_teacher_manual: boolean
          id: string
          image_url: string | null
          live_label: string | null
          live_url: string | null
          long_description: string | null
          passing_score: number
          price_cents: number | null
          published: boolean
          slug: string
          sort_order: number
          teacher_manual_image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          categoria_id?: string | null
          category: string
          coursebox_embed_url?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          external_url?: string | null
          featured?: boolean
          has_teacher_manual?: boolean
          id?: string
          image_url?: string | null
          live_label?: string | null
          live_url?: string | null
          long_description?: string | null
          passing_score?: number
          price_cents?: number | null
          published?: boolean
          slug: string
          sort_order?: number
          teacher_manual_image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          categoria_id?: string | null
          category?: string
          coursebox_embed_url?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          external_url?: string | null
          featured?: boolean
          has_teacher_manual?: boolean
          id?: string
          image_url?: string | null
          live_label?: string | null
          live_url?: string | null
          long_description?: string | null
          passing_score?: number
          price_cents?: number | null
          published?: boolean
          slug?: string
          sort_order?: number
          teacher_manual_image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_appointments: {
        Row: {
          account_id: string | null
          created_at: string
          done: boolean
          id: string
          lead_id: string | null
          notes: string | null
          owner_id: string
          scheduled_at: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          done?: boolean
          id?: string
          lead_id?: string | null
          notes?: string | null
          owner_id: string
          scheduled_at: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          done?: boolean
          id?: string
          lead_id?: string | null
          notes?: string | null
          owner_id?: string
          scheduled_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_goals: {
        Row: {
          escopo: Database["public"]["Enums"]["crm_goal_scope"]
          id: string
          updated_at: string
          updated_by: string | null
          valor_cents: number
        }
        Insert: {
          escopo: Database["public"]["Enums"]["crm_goal_scope"]
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor_cents?: number
        }
        Update: {
          escopo?: Database["public"]["Enums"]["crm_goal_scope"]
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor_cents?: number
        }
        Relationships: []
      }
      crm_lead_events: {
        Row: {
          account_id: string | null
          autor_id: string
          created_at: string
          id: string
          lead_id: string
          payload: Json
          tipo: Database["public"]["Enums"]["crm_event_type"]
        }
        Insert: {
          account_id?: string | null
          autor_id: string
          created_at?: string
          id?: string
          lead_id: string
          payload?: Json
          tipo: Database["public"]["Enums"]["crm_event_type"]
        }
        Update: {
          account_id?: string | null
          autor_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          payload?: Json
          tipo?: Database["public"]["Enums"]["crm_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          account_id: string | null
          atendimentos: number
          checklist: Json
          created_at: string
          created_by: string | null
          curso_interesse: string | null
          data_cancelamento: string | null
          descricao: string | null
          email: string | null
          estagio: Database["public"]["Enums"]["crm_stage"]
          etiqueta: Database["public"]["Enums"]["crm_temp"]
          id: string
          motivo_cancelamento: string | null
          nome: string
          origem: string | null
          owner_id: string
          stage_changed_at: string
          telefone: string | null
          updated_at: string
          urgente: boolean
          urgente_marcado_em: string | null
          urgente_resolvido_at: string | null
          urgente_resolvido_em: string | null
          valor_cents: number
        }
        Insert: {
          account_id?: string | null
          atendimentos?: number
          checklist?: Json
          created_at?: string
          created_by?: string | null
          curso_interesse?: string | null
          data_cancelamento?: string | null
          descricao?: string | null
          email?: string | null
          estagio?: Database["public"]["Enums"]["crm_stage"]
          etiqueta?: Database["public"]["Enums"]["crm_temp"]
          id?: string
          motivo_cancelamento?: string | null
          nome: string
          origem?: string | null
          owner_id: string
          stage_changed_at?: string
          telefone?: string | null
          updated_at?: string
          urgente?: boolean
          urgente_marcado_em?: string | null
          urgente_resolvido_at?: string | null
          urgente_resolvido_em?: string | null
          valor_cents?: number
        }
        Update: {
          account_id?: string | null
          atendimentos?: number
          checklist?: Json
          created_at?: string
          created_by?: string | null
          curso_interesse?: string | null
          data_cancelamento?: string | null
          descricao?: string | null
          email?: string | null
          estagio?: Database["public"]["Enums"]["crm_stage"]
          etiqueta?: Database["public"]["Enums"]["crm_temp"]
          id?: string
          motivo_cancelamento?: string | null
          nome?: string
          origem?: string | null
          owner_id?: string
          stage_changed_at?: string
          telefone?: string | null
          updated_at?: string
          urgente?: boolean
          urgente_marcado_em?: string | null
          urgente_resolvido_at?: string | null
          urgente_resolvido_em?: string | null
          valor_cents?: number
        }
        Relationships: []
      }
      crm_promo_banners: {
        Row: {
          active: boolean
          badge: string | null
          color: string
          created_at: string
          cta_url: string | null
          id: string
          image_url: string | null
          price: string | null
          price_label: string | null
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          color?: string
          created_at?: string
          cta_url?: string | null
          id?: string
          image_url?: string | null
          price?: string | null
          price_label?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          color?: string
          created_at?: string
          cta_url?: string | null
          id?: string
          image_url?: string | null
          price?: string | null
          price_label?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_settings: {
        Row: {
          chave: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      doc_links: {
        Row: {
          active: boolean
          categoria: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
          url: string
          visible_to: string
        }
        Insert: {
          active?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          url: string
          visible_to?: string
        }
        Update: {
          active?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
          visible_to?: string
        }
        Relationships: []
      }
      enrollment_applications: {
        Row: {
          birth_date: string | null
          cep: string | null
          city: string | null
          course_id: string | null
          course_modality: string | null
          course_title: string
          cpf: string | null
          created_at: string
          email: string
          entry_date: string | null
          father_name: string | null
          full_name: string
          graduation_year: string | null
          id: string
          institution: string | null
          mother_name: string | null
          naturalidade: string | null
          neighborhood: string | null
          notes: string | null
          paid_amount_cents: number | null
          paid_at: string | null
          payment_method: string | null
          payment_reminder_date: string | null
          phone: string | null
          promo_code: string | null
          rg: string | null
          rg_issue_date: string | null
          rg_issuer: string | null
          schooling: string | null
          seller_id: string | null
          source: string | null
          state: string | null
          status: string
          street: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          course_id?: string | null
          course_modality?: string | null
          course_title: string
          cpf?: string | null
          created_at?: string
          email: string
          entry_date?: string | null
          father_name?: string | null
          full_name: string
          graduation_year?: string | null
          id?: string
          institution?: string | null
          mother_name?: string | null
          naturalidade?: string | null
          neighborhood?: string | null
          notes?: string | null
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reminder_date?: string | null
          phone?: string | null
          promo_code?: string | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          schooling?: string | null
          seller_id?: string | null
          source?: string | null
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          course_id?: string | null
          course_modality?: string | null
          course_title?: string
          cpf?: string | null
          created_at?: string
          email?: string
          entry_date?: string | null
          father_name?: string | null
          full_name?: string
          graduation_year?: string | null
          id?: string
          institution?: string | null
          mother_name?: string | null
          naturalidade?: string | null
          neighborhood?: string | null
          notes?: string | null
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reminder_date?: string | null
          phone?: string | null
          promo_code?: string | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          schooling?: string | null
          seller_id?: string | null
          source?: string | null
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_applications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_exam_questions: {
        Row: {
          correct_index: number
          created_at: string
          exam_id: string
          id: string
          options: Json
          position: number
          text: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          exam_id: string
          id?: string
          options: Json
          position: number
          text: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          exam_id?: string
          id?: string
          options?: Json
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "enrollment_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_exams: {
        Row: {
          access_token: string
          application_id: string
          candidate_name: string | null
          completed_at: string | null
          course_title: string
          created_at: string
          duration_minutes: number
          id: string
          passed: boolean | null
          passing_score: number
          score: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          application_id: string
          candidate_name?: string | null
          completed_at?: string | null
          course_title: string
          created_at?: string
          duration_minutes?: number
          id?: string
          passed?: boolean | null
          passing_score?: number
          score?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          application_id?: string
          candidate_name?: string | null
          completed_at?: string | null
          course_title?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          passed?: boolean | null
          passing_score?: number
          score?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_exams_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "enrollment_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          account_id: string | null
          affiliate_id: string | null
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          notes: string | null
          progress: number
          seller_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          affiliate_id?: string | null
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          notes?: string | null
          progress?: number
          seller_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          affiliate_id?: string | null
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          notes?: string | null
          progress?: number
          seller_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          account_id: string | null
          amount_cents: number
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          installment_no: number | null
          installment_total: number | null
          kind: string
          name: string
          notes: string | null
          paid_at: string | null
          series_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          installment_no?: number | null
          installment_total?: number | null
          kind: string
          name: string
          notes?: string | null
          paid_at?: string | null
          series_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          installment_no?: number | null
          installment_total?: number | null
          kind?: string
          name?: string
          notes?: string | null
          paid_at?: string | null
          series_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          account_id: string | null
          created_at: string
          desconto_cents: number
          enrollment_id: string
          forma_pagamento: string | null
          id: string
          numero: number
          observacoes: string | null
          paid_at: string | null
          status: string
          updated_at: string
          valor_cents: number
          valor_final_cents: number | null
          vencimento: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          desconto_cents?: number
          enrollment_id: string
          forma_pagamento?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          valor_cents?: number
          valor_final_cents?: number | null
          vencimento?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          desconto_cents?: number
          enrollment_id?: string
          forma_pagamento?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          valor_cents?: number
          valor_final_cents?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          permissions: Database["public"]["Enums"]["app_permission"][]
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          permissions?: Database["public"]["Enums"]["app_permission"][]
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          permissions?: Database["public"]["Enums"]["app_permission"][]
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      lead_bank_origins: {
        Row: {
          created_at: string
          detalhe: string | null
          id: string
          last_seen_at: string
          lead_id: string
          origem: string
        }
        Insert: {
          created_at?: string
          detalhe?: string | null
          id?: string
          last_seen_at?: string
          lead_id: string
          origem: string
        }
        Update: {
          created_at?: string
          detalhe?: string | null
          id?: string
          last_seen_at?: string
          lead_id?: string
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_bank_origins_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      leads_bank: {
        Row: {
          cidade: string | null
          created_at: string
          created_by: string | null
          curso_interesse: string | null
          email: string | null
          estado: string | null
          id: string
          interesse_tipo: string | null
          nome: string
          notas: string | null
          origem: string
          responsavel_id: string | null
          situacao: string
          status_atendimento: string
          ultimo_contato_em: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          curso_interesse?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          interesse_tipo?: string | null
          nome: string
          notas?: string | null
          origem?: string
          responsavel_id?: string | null
          situacao?: string
          status_atendimento?: string
          ultimo_contato_em?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          curso_interesse?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          interesse_tipo?: string | null
          nome?: string
          notas?: string | null
          origem?: string
          responsavel_id?: string | null
          situacao?: string
          status_atendimento?: string
          ultimo_contato_em?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      leads_bank_comments: {
        Row: {
          autor_id: string | null
          created_at: string
          id: string
          lead_id: string
          texto: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          texto: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_bank_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_reflections: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          mood: string | null
          note: string | null
          self_rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          mood?: string | null
          note?: string | null
          self_rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          mood?: string | null
          note?: string | null
          self_rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_reflections_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          assunto: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          unread_for_staff: number
          unread_for_student: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assunto?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_for_staff?: number
          unread_for_student?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assunto?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_for_staff?: number
          unread_for_student?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          autor_id: string
          corpo: string
          created_at: string
          from_staff: boolean
          id: string
          thread_id: string
        }
        Insert: {
          autor_id: string
          corpo: string
          created_at?: string
          from_staff?: boolean
          id?: string
          thread_id: string
        }
        Update: {
          autor_id?: string
          corpo?: string
          created_at?: string
          from_staff?: boolean
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_url: string
          name: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string
          name: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string
          name?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      platform_reviews: {
        Row: {
          allow_public: boolean
          comment: string | null
          course_id: string | null
          created_at: string
          id: string
          improve: string | null
          liked: string | null
          rating_course: number | null
          rating_platform: number
          simulator_score: number | null
          user_id: string
        }
        Insert: {
          allow_public?: boolean
          comment?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          improve?: string | null
          liked?: string | null
          rating_course?: number | null
          rating_platform: number
          simulator_score?: number | null
          user_id: string
        }
        Update: {
          allow_public?: boolean
          comment?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          improve?: string | null
          liked?: string | null
          rating_course?: number | null
          rating_platform?: number
          simulator_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      role_definitions: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          description: string | null
          is_system: boolean
          key: string
          label: string
          permissions: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          description?: string | null
          is_system?: boolean
          key: string
          label: string
          permissions?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          description?: string | null
          is_system?: boolean
          key?: string
          label?: string
          permissions?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string | null
          file_path: string
          id: string
          mime: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name?: string | null
          file_path: string
          id?: string
          mime?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string | null
          file_path?: string
          id?: string
          mime?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          bairro: string | null
          birth_date: string | null
          bolsista: boolean
          cep: string | null
          certificado_liberado: boolean
          cidade: string | null
          contact_email: string | null
          cpf: string | null
          created_at: string
          data_final: string | null
          estado: string | null
          foto_url: string | null
          full_name: string | null
          id: string
          liberar_apostila: boolean
          numero: string | null
          observacoes: string | null
          phone: string | null
          phone1: string | null
          phone2: string | null
          polo: string | null
          responsavel_cpf: string | null
          responsavel_nome: string | null
          responsavel_rg: string | null
          rg: string | null
          rua: string | null
          sexo: string | null
          status: string
          updated_at: string
          user_id: string
          vendedor: string | null
        }
        Insert: {
          bairro?: string | null
          birth_date?: string | null
          bolsista?: boolean
          cep?: string | null
          certificado_liberado?: boolean
          cidade?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          data_final?: string | null
          estado?: string | null
          foto_url?: string | null
          full_name?: string | null
          id?: string
          liberar_apostila?: boolean
          numero?: string | null
          observacoes?: string | null
          phone?: string | null
          phone1?: string | null
          phone2?: string | null
          polo?: string | null
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          responsavel_rg?: string | null
          rg?: string | null
          rua?: string | null
          sexo?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vendedor?: string | null
        }
        Update: {
          bairro?: string | null
          birth_date?: string | null
          bolsista?: boolean
          cep?: string | null
          certificado_liberado?: boolean
          cidade?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          data_final?: string | null
          estado?: string | null
          foto_url?: string | null
          full_name?: string | null
          id?: string
          liberar_apostila?: boolean
          numero?: string | null
          observacoes?: string | null
          phone?: string | null
          phone1?: string | null
          phone2?: string | null
          polo?: string | null
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          responsavel_rg?: string | null
          rg?: string | null
          rua?: string | null
          sexo?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vendedor?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assunto: string
          categoria: string | null
          created_at: string
          id: string
          mensagem: string
          prioridade: string
          respondido_em: string | null
          respondido_por: string | null
          resposta: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assunto: string
          categoria?: string | null
          created_at?: string
          id?: string
          mensagem: string
          prioridade?: string
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assunto?: string
          categoria?: string | null
          created_at?: string
          id?: string
          mensagem?: string
          prioridade?: string
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      turma_alunos: {
        Row: {
          account_id: string | null
          added_at: string
          id: string
          turma_id: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          added_at?: string
          id?: string
          turma_id: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          added_at?: string
          id?: string
          turma_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          account_id: string | null
          capacidade: number
          course_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          capacidade?: number
          course_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          capacidade?: number
          course_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gamification: {
        Row: {
          coins: number
          created_at: string
          current_streak: number
          last_activity_at: string | null
          level: number
          longest_streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          current_streak?: number
          last_activity_at?: string | null
          level?: number
          longest_streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          current_streak?: number
          last_activity_at?: string | null
          level?: number
          longest_streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: {
        Args: { delta_coins?: number; delta_xp: number }
        Returns: {
          coins: number
          created_at: string
          current_streak: number
          last_activity_at: string | null
          level: number
          longest_streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "user_gamification"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_can_manage_all: { Args: { _uid: string }; Returns: boolean }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      lead_bank_get_crm_statuses: {
        Args: { _lead_ids: string[] }
        Returns: {
          crm_lead_id: string
          crm_nome: string
          estagio: string
          lead_bank_id: string
          seller_name: string
          stage_changed_at: string
          status_atendimento: string
        }[]
      }
      next_username: { Args: never; Returns: string }
    }
    Enums: {
      app_permission:
        | "manage_courses"
        | "manage_users"
        | "manage_leads"
        | "view_analytics"
        | "manage_content"
        | "manage_affiliates"
        | "view_commission"
        | "issue_boletos"
        | "settle_boletos"
        | "manage_certification"
      app_role: "super_admin" | "admin" | "editor" | "viewer" | "certificadora"
      crm_event_type:
        | "anotacao"
        | "troca_estagio"
        | "whatsapp"
        | "agenda"
        | "criacao"
      crm_goal_scope: "dia" | "semana" | "mes"
      crm_stage:
        | "novo"
        | "lead"
        | "fechamento"
        | "matriculado"
        | "cancelado"
        | "proximo_mes"
      crm_temp: "frio" | "morno" | "quente"
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
      app_permission: [
        "manage_courses",
        "manage_users",
        "manage_leads",
        "view_analytics",
        "manage_content",
        "manage_affiliates",
        "view_commission",
        "issue_boletos",
        "settle_boletos",
        "manage_certification",
      ],
      app_role: ["super_admin", "admin", "editor", "viewer", "certificadora"],
      crm_event_type: [
        "anotacao",
        "troca_estagio",
        "whatsapp",
        "agenda",
        "criacao",
      ],
      crm_goal_scope: ["dia", "semana", "mes"],
      crm_stage: [
        "novo",
        "lead",
        "fechamento",
        "matriculado",
        "cancelado",
        "proximo_mes",
      ],
      crm_temp: ["frio", "morno", "quente"],
    },
  },
} as const
