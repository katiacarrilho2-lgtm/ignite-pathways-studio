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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          done: boolean
          done_at: string | null
          due_date: string | null
          due_time: string | null
          id: string
          notes: string | null
          owner_id: string | null
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_goals: {
        Row: {
          active: boolean
          affiliate_id: string
          created_at: string
          id: string
          period: string
          reward_label: string | null
          target_enrollments: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliate_id: string
          created_at?: string
          id?: string
          period: string
          reward_label?: string | null
          target_enrollments?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliate_id?: string
          created_at?: string
          id?: string
          period?: string
          reward_label?: string | null
          target_enrollments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_messages: {
        Row: {
          affiliate_id: string | null
          body: string
          created_at: string
          id: string
          read_at: string | null
          sent_by: string
          title: string
        }
        Insert: {
          affiliate_id?: string | null
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sent_by: string
          title: string
        }
        Update: {
          affiliate_id?: string | null
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sent_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_messages_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_program_settings: {
        Row: {
          milestone_enrollments: number
          milestone_reward: string | null
          singleton: boolean
          star_every: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          milestone_enrollments?: number
          milestone_reward?: string | null
          singleton?: boolean
          star_every?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          milestone_enrollments?: number
          milestone_reward?: string | null
          singleton?: boolean
          star_every?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      affiliate_public_stats: {
        Row: {
          affiliate_id: string
          display_name: string
          paid_enrollments: number
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          display_name: string
          paid_enrollments?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          display_name?: string
          paid_enrollments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_public_stats_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: true
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
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
      agenda_events: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          descricao: string | null
          fim: string | null
          id: string
          inicio: string
          local: string | null
          responsavel_id: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          descricao?: string | null
          fim?: string | null
          id?: string
          inicio: string
          local?: string | null
          responsavel_id?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          descricao?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          local?: string | null
          responsavel_id?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          presente: boolean
          registrado_por: string | null
          session_id: string
          student_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          presente?: boolean
          registrado_por?: string | null
          session_id: string
          student_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          presente?: boolean
          registrado_por?: string | null
          session_id?: string
          student_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          descricao: string | null
          id: string
          modulo: string
          registro_id: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          modulo: string
          registro_id?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          modulo?: string
          registro_id?: string | null
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
      class_sessions: {
        Row: {
          classroom_id: string | null
          created_at: string
          created_by: string | null
          data: string
          id: string
          observacoes: string | null
          professor_id: string | null
          titulo: string | null
          turma_id: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          observacoes?: string | null
          professor_id?: string | null
          titulo?: string | null
          turma_id: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          observacoes?: string | null
          professor_id?: string | null
          titulo?: string | null
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          capacidade: number
          created_at: string
          id: string
          localizacao: string | null
          nome: string
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          capacidade?: number
          created_at?: string
          id?: string
          localizacao?: string | null
          nome: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          capacidade?: number
          created_at?: string
          id?: string
          localizacao?: string | null
          nome?: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
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
      corp_contratos: {
        Row: {
          created_at: string
          empresa_id: string | null
          fim_em: string | null
          id: string
          inicio_em: string | null
          observacoes: string | null
          proposta_id: string | null
          status: string
          tipo: string | null
          titulo: string
          updated_at: string
          valor_cents: number
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          observacoes?: string | null
          proposta_id?: string | null
          status?: string
          tipo?: string | null
          titulo: string
          updated_at?: string
          valor_cents?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          fim_em?: string | null
          id?: string
          inicio_em?: string | null
          observacoes?: string | null
          proposta_id?: string | null
          status?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "corp_contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "corp_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corp_contratos_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "corp_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      corp_empresas: {
        Row: {
          cidade: string | null
          cnpj: string | null
          colaboradores: number | null
          contato_cargo: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          created_by: string | null
          estagio: string
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          origem: string | null
          owner_id: string | null
          proxima_acao_em: string | null
          razao_social: string
          segmento: string | null
          uf: string | null
          updated_at: string
          valor_negociacao_cents: number
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          colaboradores?: number | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          estagio?: string
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          origem?: string | null
          owner_id?: string | null
          proxima_acao_em?: string | null
          razao_social: string
          segmento?: string | null
          uf?: string | null
          updated_at?: string
          valor_negociacao_cents?: number
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          colaboradores?: number | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          estagio?: string
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          origem?: string | null
          owner_id?: string | null
          proxima_acao_em?: string | null
          razao_social?: string
          segmento?: string | null
          uf?: string | null
          updated_at?: string
          valor_negociacao_cents?: number
        }
        Relationships: []
      }
      corp_faturamento: {
        Row: {
          contrato_id: string | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          nota_fiscal: string | null
          pago_em: string | null
          status: string
          updated_at: string
          valor_cents: number
          vencimento: string | null
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nota_fiscal?: string | null
          pago_em?: string | null
          status?: string
          updated_at?: string
          valor_cents?: number
          vencimento?: string | null
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nota_fiscal?: string | null
          pago_em?: string | null
          status?: string
          updated_at?: string
          valor_cents?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corp_faturamento_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "corp_contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corp_faturamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "corp_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      corp_propostas: {
        Row: {
          created_at: string
          empresa_id: string | null
          enviada_em: string | null
          id: string
          observacoes: string | null
          owner_id: string | null
          status: string
          tipo: string | null
          titulo: string
          updated_at: string
          validade_em: string | null
          valor_cents: number
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          enviada_em?: string | null
          id?: string
          observacoes?: string | null
          owner_id?: string | null
          status?: string
          tipo?: string | null
          titulo: string
          updated_at?: string
          validade_em?: string | null
          valor_cents?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          enviada_em?: string | null
          id?: string
          observacoes?: string | null
          owner_id?: string | null
          status?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string
          validade_em?: string | null
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "corp_propostas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "corp_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      corp_reunioes: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          notas: string | null
          owner_id: string | null
          participantes: string | null
          proxima_acao: string | null
          proxima_acao_em: string | null
          resultado: string
          scheduled_at: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          notas?: string | null
          owner_id?: string | null
          participantes?: string | null
          proxima_acao?: string | null
          proxima_acao_em?: string | null
          resultado?: string
          scheduled_at: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          notas?: string | null
          owner_id?: string | null
          participantes?: string | null
          proxima_acao?: string | null
          proxima_acao_em?: string | null
          resultado?: string
          scheduled_at?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corp_reunioes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "corp_empresas"
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
      departments: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          icone: string | null
          id: string
          nome: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          slug?: string
          sort_order?: number
          updated_at?: string
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
      document_upload_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          label: string | null
          revoked: boolean
          student_email: string | null
          student_name: string | null
          student_phone: string | null
          token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          revoked?: boolean
          student_email?: string | null
          student_name?: string | null
          student_phone?: string | null
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          revoked?: boolean
          student_email?: string | null
          student_name?: string | null
          student_phone?: string | null
          token?: string
          updated_at?: string
          user_id?: string | null
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
          submitted_by: string | null
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
          submitted_by?: string | null
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
          submitted_by?: string | null
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
      internal_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          last_message_at: string
          last_message_preview: string | null
          resolved_at: string | null
          resolved_by: string | null
          tipo: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_conversations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_documents: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          department_id: string | null
          descricao: string | null
          file_path: string
          id: string
          mime: string | null
          nome: string
          restrito: boolean
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          descricao?: string | null
          file_path: string
          id?: string
          mime?: string | null
          nome: string
          restrito?: boolean
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          descricao?: string | null
          file_path?: string
          id?: string
          mime?: string | null
          nome?: string
          restrito?: boolean
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          attachment_path: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "internal_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "internal_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "internal_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_request_events: {
        Row: {
          autor_id: string | null
          created_at: string
          descricao: string | null
          id: string
          request_id: string
          tipo: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          request_id: string
          tipo?: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          request_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "internal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_requests: {
        Row: {
          created_at: string
          descricao: string | null
          from_department_id: string | null
          id: string
          numero: number
          prazo: string | null
          prioridade: string
          responsavel_id: string | null
          solicitante_id: string | null
          status: string
          titulo: string
          to_department_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          from_department_id?: string | null
          id?: string
          numero?: number
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          solicitante_id?: string | null
          status?: string
          titulo: string
          to_department_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          from_department_id?: string | null
          id?: string
          numero?: number
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          solicitante_id?: string | null
          status?: string
          titulo?: string
          to_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_requests_from_department_id_fkey"
            columns: ["from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_requests_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          estoque_minimo: number
          fornecedor: string | null
          id: string
          localizacao: string | null
          nome: string
          observacoes: string | null
          quantidade: number
          unidade: string
          updated_at: string
          valor_unit_cents: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_unit_cents?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_unit_cents?: number
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          data: string
          documento: string | null
          fornecedor: string | null
          id: string
          item_id: string
          motivo: string | null
          quantidade: number
          responsavel_id: string | null
          setor_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          data?: string
          documento?: string | null
          fornecedor?: string | null
          id?: string
          item_id: string
          motivo?: string | null
          quantidade: number
          responsavel_id?: string | null
          setor_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          data?: string
          documento?: string | null
          fornecedor?: string | null
          id?: string
          item_id?: string
          motivo?: string | null
          quantidade?: number
          responsavel_id?: string | null
          setor_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
      maintenance_requests: {
        Row: {
          classroom_id: string | null
          created_at: string
          created_by: string | null
          custo_cents: number
          data: string
          id: string
          local: string | null
          patrimonio_id: string | null
          prioridade: string
          problema: string
          responsavel_id: string | null
          solucao: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_cents?: number
          data?: string
          id?: string
          local?: string | null
          patrimonio_id?: string | null
          prioridade?: string
          problema: string
          responsavel_id?: string | null
          solucao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_cents?: number
          data?: string
          id?: string
          local?: string | null
          patrimonio_id?: string | null
          prioridade?: string
          problema?: string
          responsavel_id?: string | null
          solucao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_patrimonio_id_fkey"
            columns: ["patrimonio_id"]
            isOneToOne: false
            referencedRelation: "patrimonio"
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
      mkt_assets: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string | null
          file_path: string | null
          folder_id: string | null
          id: string
          is_favorite: boolean
          mime: string | null
          nome: string
          observacoes: string | null
          original_name: string | null
          pasta: string
          size_bytes: number | null
          tags: string[]
          tipo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean
          mime?: string | null
          nome: string
          observacoes?: string | null
          original_name?: string | null
          pasta?: string
          size_bytes?: number | null
          tags?: string[]
          tipo?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          folder_id?: string | null
          id?: string
          is_favorite?: boolean
          mime?: string | null
          nome?: string
          observacoes?: string | null
          original_name?: string | null
          pasta?: string
          size_bytes?: number | null
          tags?: string[]
          tipo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mkt_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mkt_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "mkt_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_campaigns: {
        Row: {
          budget_cents: number
          canal: string
          created_at: string
          created_by: string | null
          fim: string | null
          gasto_cents: number
          id: string
          inicio: string | null
          leads: number
          nome: string
          objetivo: string | null
          observacoes: string | null
          receita_cents: number
          responsavel_id: string | null
          status: string
          updated_at: string
          vendas: number
        }
        Insert: {
          budget_cents?: number
          canal?: string
          created_at?: string
          created_by?: string | null
          fim?: string | null
          gasto_cents?: number
          id?: string
          inicio?: string | null
          leads?: number
          nome: string
          objetivo?: string | null
          observacoes?: string | null
          receita_cents?: number
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          vendas?: number
        }
        Update: {
          budget_cents?: number
          canal?: string
          created_at?: string
          created_by?: string | null
          fim?: string | null
          gasto_cents?: number
          id?: string
          inicio?: string | null
          leads?: number
          nome?: string
          objetivo?: string | null
          observacoes?: string | null
          receita_cents?: number
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          vendas?: number
        }
        Relationships: []
      }
      mkt_folders: {
        Row: {
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mkt_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_social_posts: {
        Row: {
          asset_id: string | null
          campaign_id: string | null
          created_at: string
          created_by: string | null
          formato: string
          id: string
          legenda: string | null
          link: string | null
          rede: string
          responsavel_id: string | null
          scheduled_at: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          formato?: string
          id?: string
          legenda?: string | null
          link?: string | null
          rede?: string
          responsavel_id?: string | null
          scheduled_at?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          formato?: string
          id?: string
          legenda?: string | null
          link?: string | null
          rede?: string
          responsavel_id?: string | null
          scheduled_at?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_social_posts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "mkt_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mkt_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_tasks: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          done_at: string | null
          due_date: string | null
          id: string
          ordem: number
          prioridade: string
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          ordem?: number
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          ordem?: number
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mkt_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_vault: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          id: string
          login: string | null
          notas: string | null
          senha: string | null
          servico: string
          updated_at: string
          url: string | null
        }
        Insert: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          id?: string
          login?: string | null
          notas?: string | null
          senha?: string | null
          servico: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          id?: string
          login?: string | null
          notas?: string | null
          senha?: string | null
          servico?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          corpo: string | null
          created_at: string
          department_id: string | null
          id: string
          link: string | null
          read_at: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          corpo?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          corpo?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
      patrimonio: {
        Row: {
          categoria: string | null
          classroom_id: string | null
          codigo: string | null
          created_at: string
          data_aquisicao: string | null
          estado: string
          id: string
          localizacao: string | null
          nome: string
          numero_patrimonio: string | null
          observacoes: string | null
          responsavel_id: string | null
          status: string
          updated_at: string
          valor_cents: number
        }
        Insert: {
          categoria?: string | null
          classroom_id?: string | null
          codigo?: string | null
          created_at?: string
          data_aquisicao?: string | null
          estado?: string
          id?: string
          localizacao?: string | null
          nome: string
          numero_patrimonio?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          valor_cents?: number
        }
        Update: {
          categoria?: string | null
          classroom_id?: string | null
          codigo?: string | null
          created_at?: string
          data_aquisicao?: string | null
          estado?: string
          id?: string
          localizacao?: string | null
          nome?: string
          numero_patrimonio?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "patrimonio_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      pedagogic_occurrences: {
        Row: {
          autor_id: string | null
          created_at: string
          descricao: string | null
          gravidade: string
          id: string
          status: string
          student_user_id: string | null
          tipo: string
          titulo: string
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          gravidade?: string
          id?: string
          status?: string
          student_user_id?: string | null
          tipo?: string
          titulo: string
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          gravidade?: string
          id?: string
          status?: string
          student_user_id?: string | null
          tipo?: string
          titulo?: string
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedagogic_occurrences_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
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
          ativo: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          department_id: string | null
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      repasse_contratos: {
        Row: {
          ativo: boolean
          created_at: string
          enrollment_id: string
          id: string
          observacoes: string | null
          parceiro_id: string
          percentual: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          enrollment_id: string
          id?: string
          observacoes?: string | null
          parceiro_id: string
          percentual?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          enrollment_id?: string
          id?: string
          observacoes?: string | null
          parceiro_id?: string
          percentual?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repasse_contratos_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasse_contratos_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "repasse_parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      repasse_parceiros: {
        Row: {
          ativo: boolean
          created_at: string
          dia_fechamento: number
          dia_pagamento: number
          id: string
          nome: string
          observacoes: string | null
          percentual: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_fechamento?: number
          dia_pagamento?: number
          id?: string
          nome: string
          observacoes?: string | null
          percentual?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_fechamento?: number
          dia_pagamento?: number
          id?: string
          nome?: string
          observacoes?: string | null
          percentual?: number
          updated_at?: string
        }
        Relationships: []
      }
      repasse_parcelas: {
        Row: {
          contrato_id: string
          created_at: string
          id: string
          installment_id: string
          numero: number
          observacoes: string | null
          previsao: string | null
          recebido_em: string | null
          status: string
          updated_at: string
          valor_aluno_cents: number
          valor_recebido_cents: number | null
          valor_repasse_cents: number
        }
        Insert: {
          contrato_id: string
          created_at?: string
          id?: string
          installment_id: string
          numero?: number
          observacoes?: string | null
          previsao?: string | null
          recebido_em?: string | null
          status?: string
          updated_at?: string
          valor_aluno_cents?: number
          valor_recebido_cents?: number | null
          valor_repasse_cents?: number
        }
        Update: {
          contrato_id?: string
          created_at?: string
          id?: string
          installment_id?: string
          numero?: number
          observacoes?: string | null
          previsao?: string | null
          recebido_em?: string | null
          status?: string
          updated_at?: string
          valor_aluno_cents?: number
          valor_recebido_cents?: number | null
          valor_repasse_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "repasse_parcelas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "repasse_contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasse_parcelas_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: true
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
        ]
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
      room_reservations: {
        Row: {
          classroom_id: string
          created_at: string
          department_id: string | null
          fim: string
          finalidade: string
          id: string
          inicio: string
          observacoes: string | null
          responsavel_id: string | null
          titulo: string
          turma_id: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string
          department_id?: string | null
          fim: string
          finalidade?: string
          id?: string
          inicio: string
          observacoes?: string | null
          responsavel_id?: string | null
          titulo: string
          turma_id?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string
          department_id?: string | null
          fim?: string
          finalidade?: string
          id?: string
          inicio?: string
          observacoes?: string | null
          responsavel_id?: string | null
          titulo?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_reservations_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_reservations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_reservations_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string | null
          file_path: string
          id: string
          link_id: string | null
          mime: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name?: string | null
          file_path: string
          id?: string
          link_id?: string | null
          mime?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string | null
          file_path?: string
          id?: string
          link_id?: string | null
          mime?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "document_upload_links"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          ano_formacao: string | null
          bairro: string | null
          birth_date: string | null
          bolsista: boolean
          cep: string | null
          certificado_liberado: boolean
          cidade: string | null
          contact_email: string | null
          cpf: string | null
          created_at: string
          curso_escolhido: string | null
          data_final: string | null
          escolaridade: string | null
          estado: string | null
          foto_url: string | null
          full_name: string | null
          id: string
          instituicao_formacao: string | null
          liberar_apostila: boolean
          mae: string | null
          naturalidade: string | null
          numero: string | null
          observacoes: string | null
          orgao_emissor: string | null
          pai: string | null
          phone: string | null
          phone1: string | null
          phone2: string | null
          polo: string | null
          responsavel_cpf: string | null
          responsavel_nome: string | null
          responsavel_rg: string | null
          rg: string | null
          rg_emissao: string | null
          rua: string | null
          sexo: string | null
          status: string
          updated_at: string
          user_id: string
          vendedor: string | null
        }
        Insert: {
          ano_formacao?: string | null
          bairro?: string | null
          birth_date?: string | null
          bolsista?: boolean
          cep?: string | null
          certificado_liberado?: boolean
          cidade?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          curso_escolhido?: string | null
          data_final?: string | null
          escolaridade?: string | null
          estado?: string | null
          foto_url?: string | null
          full_name?: string | null
          id?: string
          instituicao_formacao?: string | null
          liberar_apostila?: boolean
          mae?: string | null
          naturalidade?: string | null
          numero?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          pai?: string | null
          phone?: string | null
          phone1?: string | null
          phone2?: string | null
          polo?: string | null
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          responsavel_rg?: string | null
          rg?: string | null
          rg_emissao?: string | null
          rua?: string | null
          sexo?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vendedor?: string | null
        }
        Update: {
          ano_formacao?: string | null
          bairro?: string | null
          birth_date?: string | null
          bolsista?: boolean
          cep?: string | null
          certificado_liberado?: boolean
          cidade?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          curso_escolhido?: string | null
          data_final?: string | null
          escolaridade?: string | null
          estado?: string | null
          foto_url?: string | null
          full_name?: string | null
          id?: string
          instituicao_formacao?: string | null
          liberar_apostila?: boolean
          mae?: string | null
          naturalidade?: string | null
          numero?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          pai?: string | null
          phone?: string | null
          phone1?: string | null
          phone2?: string | null
          polo?: string | null
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          responsavel_rg?: string | null
          rg?: string | null
          rg_emissao?: string | null
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
      is_affiliate_of_application: {
        Args: { _promo_code: string; _seller_id: string; _uid: string }
        Returns: boolean
      }
      is_conv_participant: {
        Args: { _conv: string; _uid: string }
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
      lead_bank_import_batch: {
        Args: {
          _curso_interesse?: string
          _grupo_nome?: string
          _interesse_tipo?: string
          _items: Json
          _origem: string
          _origem_tipo?: string
          _situacao?: string
        }
        Returns: Json
      }
      next_username: { Args: never; Returns: string }
      repasse_previsao: {
        Args: { _fechamento: number; _pagamento: number; _venc: string }
        Returns: string
      }
      repasse_sync_contrato: {
        Args: { _contrato_id: string }
        Returns: undefined
      }
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
        | "mod_dashboard"
        | "mod_certificacao"
        | "mod_documentos_links"
        | "mod_crm"
        | "mod_connect"
        | "mod_cursos"
        | "mod_cursos_ia"
        | "mod_corporativo"
        | "mod_categorias"
        | "mod_andamento"
        | "mod_imagens"
        | "mod_promo"
        | "mod_parceiros"
        | "mod_cupons"
        | "mod_marketing"
        | "mod_alunos"
        | "mod_pre_matriculas"
        | "mod_turmas"
        | "mod_usuarios"
        | "mod_cargos"
        | "mod_leads"
        | "mod_mensagens"
        | "mod_suporte"
        | "mod_financeiro"
        | "mod_relatorios"
        | "mod_afiliados"
        | "mod_meu_afiliado"
        | "mod_treinamentos"
        | "mod_rede_interna"
        | "mod_solicitacoes"
        | "mod_almoxarifado"
        | "mod_escola_fisica"
        | "mod_patrimonio"
        | "mod_manutencao"
        | "mod_pedagogia"
        | "mod_frequencia"
        | "mod_agenda"
        | "mod_documentos_internos"
        | "mod_auditoria"
        | "mod_departamentos"
        | "manage_vault"
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
        "mod_dashboard",
        "mod_certificacao",
        "mod_documentos_links",
        "mod_crm",
        "mod_connect",
        "mod_cursos",
        "mod_cursos_ia",
        "mod_corporativo",
        "mod_categorias",
        "mod_andamento",
        "mod_imagens",
        "mod_promo",
        "mod_parceiros",
        "mod_cupons",
        "mod_marketing",
        "mod_alunos",
        "mod_pre_matriculas",
        "mod_turmas",
        "mod_usuarios",
        "mod_cargos",
        "mod_leads",
        "mod_mensagens",
        "mod_suporte",
        "mod_financeiro",
        "mod_relatorios",
        "mod_afiliados",
        "mod_meu_afiliado",
        "mod_treinamentos",
        "mod_rede_interna",
        "mod_solicitacoes",
        "mod_almoxarifado",
        "mod_escola_fisica",
        "mod_patrimonio",
        "mod_manutencao",
        "mod_pedagogia",
        "mod_frequencia",
        "mod_agenda",
        "mod_documentos_internos",
        "mod_auditoria",
        "mod_departamentos",
        "manage_vault",
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
