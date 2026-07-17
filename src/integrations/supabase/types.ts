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
      admin_read_state: {
        Row: {
          channel: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_tasks: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          due_at: string | null
          id: string
          linked_id: string | null
          linked_label: string | null
          linked_type: string | null
          position: number
          priority: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_at?: string | null
          id?: string
          linked_id?: string | null
          linked_label?: string | null
          linked_type?: string | null
          position?: number
          priority?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_at?: string | null
          id?: string
          linked_id?: string | null
          linked_label?: string | null
          linked_type?: string | null
          position?: number
          priority?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_commission_payouts: {
        Row: {
          amount_cents: number
          confirmed_at: string | null
          created_at: string
          id: string
          note: string | null
          paid_at: string
          paid_by: string | null
          referral_id: string
        }
        Insert: {
          amount_cents: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          paid_by?: string | null
          referral_id: string
        }
        Update: {
          amount_cents?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          paid_by?: string | null
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commission_payouts_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          account_id: string | null
          affiliate_id: string
          commission_cents: number
          commission_confirmed_at: string | null
          commission_note: string | null
          commission_paid_at: string | null
          commission_paid_by: string | null
          created_at: string
          enrollment_id: string | null
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          valor_cents: number
        }
        Insert: {
          account_id?: string | null
          affiliate_id: string
          commission_cents?: number
          commission_confirmed_at?: string | null
          commission_note?: string | null
          commission_paid_at?: string | null
          commission_paid_by?: string | null
          created_at?: string
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          valor_cents?: number
        }
        Update: {
          account_id?: string | null
          affiliate_id?: string
          commission_cents?: number
          commission_confirmed_at?: string | null
          commission_note?: string | null
          commission_paid_at?: string | null
          commission_paid_by?: string | null
          created_at?: string
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
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
          id: string
          nome: string | null
          tipo: string
          url: string
          variant_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          nome?: string | null
          tipo: string
          url: string
          variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          nome?: string | null
          tipo?: string
          url?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connect_campaign_attachments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "connect_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connect_campaign_attachments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "connect_campaign_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_campaign_messages: {
        Row: {
          agendada_para: string | null
          ai_generated: boolean
          campaign_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          entregue_em: string | null
          enviada_em: string | null
          erro: string | null
          id: string
          lida_em: string | null
          mensagem: string
          status: Database["public"]["Enums"]["connect_message_status"]
          tentativas: number
          variant_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          agendada_para?: string | null
          ai_generated?: boolean
          campaign_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          entregue_em?: string | null
          enviada_em?: string | null
          erro?: string | null
          id?: string
          lida_em?: string | null
          mensagem: string
          status?: Database["public"]["Enums"]["connect_message_status"]
          tentativas?: number
          variant_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          agendada_para?: string | null
          ai_generated?: boolean
          campaign_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          entregue_em?: string | null
          enviada_em?: string | null
          erro?: string | null
          id?: string
          lida_em?: string | null
          mensagem?: string
          status?: Database["public"]["Enums"]["connect_message_status"]
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
            foreignKeyName: "connect_campaign_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "connect_conversations"
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
          agendado_para: string | null
          concluido_em: string | null
          conexao: string | null
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
          intervalo_segundos: number
          mensagem: string
          msgs_por_hora: number
          nome: string
          pausa_apos_msgs: number
          pausa_minutos: number
          recorrencia: string
          status: Database["public"]["Enums"]["connect_campaign_status"]
          tipo_publico: string
          total_destinatarios: number
          total_enviadas: number
          total_falhas: number
          updated_at: string
        }
        Insert: {
          agendado_para?: string | null
          concluido_em?: string | null
          conexao?: string | null
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
          intervalo_segundos?: number
          mensagem: string
          msgs_por_hora?: number
          nome: string
          pausa_apos_msgs?: number
          pausa_minutos?: number
          recorrencia?: string
          status?: Database["public"]["Enums"]["connect_campaign_status"]
          tipo_publico?: string
          total_destinatarios?: number
          total_enviadas?: number
          total_falhas?: number
          updated_at?: string
        }
        Update: {
          agendado_para?: string | null
          concluido_em?: string | null
          conexao?: string | null
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
          intervalo_segundos?: number
          mensagem?: string
          msgs_por_hora?: number
          nome?: string
          pausa_apos_msgs?: number
          pausa_minutos?: number
          recorrencia?: string
          status?: Database["public"]["Enums"]["connect_campaign_status"]
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
          course_id: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string
          course_id?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          course_id?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_contact_tags_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_contacts: {
        Row: {
          cidade: string | null
          created_at: string
          created_by: string | null
          curso_interesse_id: string | null
          email: string | null
          estado: string | null
          group_id: string | null
          id: string
          metadata: Json
          nome: string
          observacoes: string | null
          opt_out: boolean
          origem: string | null
          stage_id: string | null
          stage_ordem: number
          status: Database["public"]["Enums"]["connect_contact_status"]
          tags: string[]
          tipo: string
          updated_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          curso_interesse_id?: string | null
          email?: string | null
          estado?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json
          nome: string
          observacoes?: string | null
          opt_out?: boolean
          origem?: string | null
          stage_id?: string | null
          stage_ordem?: number
          status?: Database["public"]["Enums"]["connect_contact_status"]
          tags?: string[]
          tipo?: string
          updated_at?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          curso_interesse_id?: string | null
          email?: string | null
          estado?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json
          nome?: string
          observacoes?: string | null
          opt_out?: boolean
          origem?: string | null
          stage_id?: string | null
          stage_ordem?: number
          status?: Database["public"]["Enums"]["connect_contact_status"]
          tags?: string[]
          tipo?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_contacts_curso_interesse_id_fkey"
            columns: ["curso_interesse_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connect_contacts_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "connect_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_conversations: {
        Row: {
          ai_enabled: boolean
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          metadata: Json
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          metadata?: Json
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "connect_contacts"
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
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          is_final?: boolean
          nome: string
          ordem?: number
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          is_final?: boolean
          nome?: string
          ordem?: number
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
          status: Database["public"]["Enums"]["status_conta_comercial"]
          telefone_contato: string | null
          tipo_da_conta: Database["public"]["Enums"]["tipo_conta_comercial"]
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
          status?: Database["public"]["Enums"]["status_conta_comercial"]
          telefone_contato?: string | null
          tipo_da_conta: Database["public"]["Enums"]["tipo_conta_comercial"]
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
          status?: Database["public"]["Enums"]["status_conta_comercial"]
          telefone_contato?: string | null
          tipo_da_conta?: Database["public"]["Enums"]["tipo_conta_comercial"]
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
      corp_clients: {
        Row: {
          cidade: string | null
          cnpj_cpf: string | null
          colaboradores: number | null
          contato_cargo: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          endereco: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          owner_id: string | null
          razao_social: string
          segmento: string | null
          tipo: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj_cpf?: string | null
          colaboradores?: number | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          owner_id?: string | null
          razao_social: string
          segmento?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj_cpf?: string | null
          colaboradores?: number | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          owner_id?: string | null
          razao_social?: string
          segmento?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      corp_contracts: {
        Row: {
          clausulas: Json
          client_account_id: string | null
          client_id: string | null
          created_at: string
          dados: Json
          id: string
          issuer_account_id: string | null
          owner_id: string | null
          proposal_id: string | null
          share_token: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          valor_cents: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          clausulas?: Json
          client_account_id?: string | null
          client_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
          issuer_account_id?: string | null
          owner_id?: string | null
          proposal_id?: string | null
          share_token?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
          valor_cents?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          clausulas?: Json
          client_account_id?: string | null
          client_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
          issuer_account_id?: string | null
          owner_id?: string | null
          proposal_id?: string | null
          share_token?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          valor_cents?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corp_contracts_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corp_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "corp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corp_contracts_issuer_account_id_fkey"
            columns: ["issuer_account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corp_contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "corp_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      corp_document_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          document_type: string
          id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          document_type: string
          id?: string
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          document_type?: string
          id?: string
          snapshot?: Json
        }
        Relationships: []
      }
      corp_partners: {
        Row: {
          ativo: boolean
          cidade: string | null
          client_id: string | null
          cnpj_cpf: string | null
          comissao_percent: number | null
          created_at: string
          email: string | null
          id: string
          metadata: Json
          nome: string
          owner_id: string | null
          plano: string | null
          telefone: string | null
          tipo: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          client_id?: string | null
          cnpj_cpf?: string | null
          comissao_percent?: number | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          nome: string
          owner_id?: string | null
          plano?: string | null
          telefone?: string | null
          tipo: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          client_id?: string | null
          cnpj_cpf?: string | null
          comissao_percent?: number | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          nome?: string
          owner_id?: string | null
          plano?: string | null
          telefone?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corp_partners_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "corp_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      corp_proposals: {
        Row: {
          accepted_at: string | null
          client_account_id: string | null
          client_id: string | null
          created_at: string
          dados: Json
          id: string
          issuer_account_id: string | null
          modalidade: string | null
          numero: string | null
          owner_id: string | null
          sent_at: string | null
          share_token: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          validade_dias: number | null
          valor_total_cents: number | null
        }
        Insert: {
          accepted_at?: string | null
          client_account_id?: string | null
          client_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
          issuer_account_id?: string | null
          modalidade?: string | null
          numero?: string | null
          owner_id?: string | null
          sent_at?: string | null
          share_token?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
          validade_dias?: number | null
          valor_total_cents?: number | null
        }
        Update: {
          accepted_at?: string | null
          client_account_id?: string | null
          client_id?: string | null
          created_at?: string
          dados?: Json
          id?: string
          issuer_account_id?: string | null
          modalidade?: string | null
          numero?: string | null
          owner_id?: string | null
          sent_at?: string | null
          share_token?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          validade_dias?: number | null
          valor_total_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "corp_proposals_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corp_proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "corp_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corp_proposals_issuer_account_id_fkey"
            columns: ["issuer_account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      corp_templates: {
        Row: {
          conteudo: Json
          created_at: string
          descricao: string | null
          id: string
          is_system: boolean
          kind: string
          segmento: string
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          is_system?: boolean
          kind: string
          segmento: string
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          is_system?: boolean
          kind?: string
          segmento?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          account_id: string | null
          amount_paid_cents: number | null
          coupon_id: string
          course_id: string | null
          created_at: string
          email: string | null
          external_reference: string | null
          id: string
        }
        Insert: {
          account_id?: string | null
          amount_paid_cents?: number | null
          coupon_id: string
          course_id?: string | null
          created_at?: string
          email?: string | null
          external_reference?: string | null
          id?: string
        }
        Update: {
          account_id?: string | null
          amount_paid_cents?: number | null
          coupon_id?: string
          course_id?: string | null
          created_at?: string
          email?: string | null
          external_reference?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          account_id: string
          active: boolean
          code: string
          course_id: string | null
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          updated_at: string
          uses: number
          valid_until: string | null
        }
        Insert: {
          account_id: string
          active?: boolean
          code: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          updated_at?: string
          uses?: number
          valid_until?: string | null
        }
        Update: {
          account_id?: string
          active?: boolean
          code?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          updated_at?: string
          uses?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_account_id_fkey"
            columns: ["account_id"]
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
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
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
      course_messages: {
        Row: {
          body: string
          created_at: string
          enrollment_id: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          enrollment_id: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      course_sections: {
        Row: {
          ai_meta: Json
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          ai_meta?: Json
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          ai_meta?: Json
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
          account_id: string
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
          account_id: string
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
          account_id?: string
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
            foreignKeyName: "crm_appointments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
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
          account_id: string | null
          escopo: Database["public"]["Enums"]["crm_goal_scope"]
          id: string
          updated_at: string
          updated_by: string | null
          valor_cents: number
        }
        Insert: {
          account_id?: string | null
          escopo: Database["public"]["Enums"]["crm_goal_scope"]
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor_cents?: number
        }
        Update: {
          account_id?: string | null
          escopo?: Database["public"]["Enums"]["crm_goal_scope"]
          id?: string
          updated_at?: string
          updated_by?: string | null
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_events: {
        Row: {
          account_id: string
          autor_id: string
          created_at: string
          id: string
          lead_id: string
          payload: Json
          tipo: Database["public"]["Enums"]["crm_event_type"]
        }
        Insert: {
          account_id: string
          autor_id: string
          created_at?: string
          id?: string
          lead_id: string
          payload?: Json
          tipo: Database["public"]["Enums"]["crm_event_type"]
        }
        Update: {
          account_id?: string
          autor_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          payload?: Json
          tipo?: Database["public"]["Enums"]["crm_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
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
          account_id: string
          atendimentos: number
          checklist: Json
          created_at: string
          created_by: string | null
          curso_interesse: string | null
          data_cancelamento: string | null
          descricao: string | null
          email: string | null
          email_norm: string | null
          estagio: Database["public"]["Enums"]["crm_stage"]
          etiqueta: Database["public"]["Enums"]["crm_temp"]
          id: string
          motivo_cancelamento: string | null
          nome: string
          origem: string | null
          owner_id: string
          stage_changed_at: string
          telefone: string | null
          telefone_norm: string | null
          updated_at: string
          urgente: boolean
          urgente_marcado_em: string | null
          urgente_resolvido_em: string | null
          valor_cents: number
        }
        Insert: {
          account_id: string
          atendimentos?: number
          checklist?: Json
          created_at?: string
          created_by?: string | null
          curso_interesse?: string | null
          data_cancelamento?: string | null
          descricao?: string | null
          email?: string | null
          email_norm?: string | null
          estagio?: Database["public"]["Enums"]["crm_stage"]
          etiqueta?: Database["public"]["Enums"]["crm_temp"]
          id?: string
          motivo_cancelamento?: string | null
          nome: string
          origem?: string | null
          owner_id: string
          stage_changed_at?: string
          telefone?: string | null
          telefone_norm?: string | null
          updated_at?: string
          urgente?: boolean
          urgente_marcado_em?: string | null
          urgente_resolvido_em?: string | null
          valor_cents?: number
        }
        Update: {
          account_id?: string
          atendimentos?: number
          checklist?: Json
          created_at?: string
          created_by?: string | null
          curso_interesse?: string | null
          data_cancelamento?: string | null
          descricao?: string | null
          email?: string | null
          email_norm?: string | null
          estagio?: Database["public"]["Enums"]["crm_stage"]
          etiqueta?: Database["public"]["Enums"]["crm_temp"]
          id?: string
          motivo_cancelamento?: string | null
          nome?: string
          origem?: string | null
          owner_id?: string
          stage_changed_at?: string
          telefone?: string | null
          telefone_norm?: string | null
          updated_at?: string
          urgente?: boolean
          urgente_marcado_em?: string | null
          urgente_resolvido_em?: string | null
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
        ]
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
      document_upload_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          for_certification: boolean
          id: string
          label: string | null
          revoked: boolean
          student_email: string | null
          student_name: string | null
          token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          for_certification?: boolean
          id?: string
          label?: string | null
          revoked?: boolean
          student_email?: string | null
          student_name?: string | null
          token: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          for_certification?: boolean
          id?: string
          label?: string | null
          revoked?: boolean
          student_email?: string | null
          student_name?: string | null
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enrollment_applications: {
        Row: {
          account_id: string | null
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
          account_id?: string | null
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
          account_id?: string | null
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
            foreignKeyName: "enrollment_applications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
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
          certificate_authorized: boolean
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
          certificate_authorized?: boolean
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
          certificate_authorized?: boolean
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
            foreignKeyName: "enrollments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
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
          account_id: string
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
          account_id: string
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
          account_id?: string
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
          account_id: string
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
          account_id: string
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
          account_id?: string
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
            foreignKeyName: "installments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
          first_seen_at: string
          grupo_nome: string | null
          id: string
          last_seen_at: string
          lead_id: string
          observacao: string | null
          occurrences: number
          origem: string
          origem_tipo: string | null
        }
        Insert: {
          created_by?: string | null
          first_seen_at?: string
          grupo_nome?: string | null
          id?: string
          last_seen_at?: string
          lead_id: string
          observacao?: string | null
          occurrences?: number
          origem: string
          origem_tipo?: string | null
        }
        Update: {
          created_by?: string | null
          first_seen_at?: string
          grupo_nome?: string | null
          id?: string
          last_seen_at?: string
          lead_id?: string
          observacao?: string | null
          occurrences?: number
          origem?: string
          origem_tipo?: string | null
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
          crm_lead_id: string | null
          curso_interesse: string | null
          email: string | null
          email_norm: string | null
          estado: string | null
          etiquetas: string[]
          id: string
          interesse_tipo: string | null
          nome: string
          notas: string | null
          origem: string | null
          proxima_acao_em: string | null
          responsavel_id: string | null
          situacao: Database["public"]["Enums"]["lead_bank_situacao"]
          status_atendimento: string
          ultimo_contato_em: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_norm: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          crm_lead_id?: string | null
          curso_interesse?: string | null
          email?: string | null
          email_norm?: string | null
          estado?: string | null
          etiquetas?: string[]
          id?: string
          interesse_tipo?: string | null
          nome: string
          notas?: string | null
          origem?: string | null
          proxima_acao_em?: string | null
          responsavel_id?: string | null
          situacao?: Database["public"]["Enums"]["lead_bank_situacao"]
          status_atendimento?: string
          ultimo_contato_em?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_norm?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          crm_lead_id?: string | null
          curso_interesse?: string | null
          email?: string | null
          email_norm?: string | null
          estado?: string | null
          etiquetas?: string[]
          id?: string
          interesse_tipo?: string | null
          nome?: string
          notas?: string | null
          origem?: string | null
          proxima_acao_em?: string | null
          responsavel_id?: string | null
          situacao?: Database["public"]["Enums"]["lead_bank_situacao"]
          status_atendimento?: string
          ultimo_contato_em?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_norm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_bank_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
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
      membros_da_conta: {
        Row: {
          account_id: string
          convidado_por: string | null
          criado_em: string
          funcao_na_conta: Database["public"]["Enums"]["funcao_conta"]
          id: string
          permissoes: Database["public"]["Enums"]["app_permission"][]
          status: Database["public"]["Enums"]["status_membro_conta"]
          user_id: string
        }
        Insert: {
          account_id: string
          convidado_por?: string | null
          criado_em?: string
          funcao_na_conta?: Database["public"]["Enums"]["funcao_conta"]
          id?: string
          permissoes?: Database["public"]["Enums"]["app_permission"][]
          status?: Database["public"]["Enums"]["status_membro_conta"]
          user_id: string
        }
        Update: {
          account_id?: string
          convidado_por?: string | null
          criado_em?: string
          funcao_na_conta?: Database["public"]["Enums"]["funcao_conta"]
          id?: string
          permissoes?: Database["public"]["Enums"]["app_permission"][]
          status?: Database["public"]["Enums"]["status_membro_conta"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_da_conta_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_logs: {
        Row: {
          etapa: string
          executado_em: string
          executado_por: string | null
          id: string
          observacao: string | null
          quantidade_processada: number
          tabela: string
        }
        Insert: {
          etapa: string
          executado_em?: string
          executado_por?: string | null
          id?: string
          observacao?: string | null
          quantidade_processada?: number
          tabela: string
        }
        Update: {
          etapa?: string
          executado_em?: string
          executado_por?: string | null
          id?: string
          observacao?: string | null
          quantidade_processada?: number
          tabela?: string
        }
        Relationships: []
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
          logo_url: string
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
      profiles: {
        Row: {
          address_number: string | null
          avatar_url: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          neighborhood: string | null
          notes: string | null
          phone1: string | null
          phone2: string | null
          polo: string | null
          responsible_cpf: string | null
          responsible_name: string | null
          responsible_rg: string | null
          rg: string | null
          role_key: string | null
          sex: string | null
          state: string | null
          status: string
          street: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          address_number?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          neighborhood?: string | null
          notes?: string | null
          phone1?: string | null
          phone2?: string | null
          polo?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          responsible_rg?: string | null
          rg?: string | null
          role_key?: string | null
          sex?: string | null
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          address_number?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          neighborhood?: string | null
          notes?: string | null
          phone1?: string | null
          phone2?: string | null
          polo?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          responsible_rg?: string | null
          rg?: string | null
          role_key?: string | null
          sex?: string | null
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
      promo_slides: {
        Row: {
          active: boolean
          badges: Json
          course_id: string | null
          created_at: string
          cta_url: string | null
          eyebrow: string | null
          highlight: string | null
          id: string
          image_url: string | null
          price: string | null
          price_label: string | null
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          active?: boolean
          badges?: Json
          course_id?: string | null
          created_at?: string
          cta_url?: string | null
          eyebrow?: string | null
          highlight?: string | null
          id?: string
          image_url?: string | null
          price?: string | null
          price_label?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
          variant?: string
        }
        Update: {
          active?: boolean
          badges?: Json
          course_id?: string | null
          created_at?: string
          cta_url?: string | null
          eyebrow?: string | null
          highlight?: string | null
          id?: string
          image_url?: string | null
          price?: string | null
          price_label?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
          variant?: string
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
      seller_applications: {
        Row: {
          approved_affiliate_id: string | null
          approved_user_id: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string
          experience: string | null
          full_name: string
          id: string
          instagram: string | null
          motivation: string | null
          pix_key: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          approved_affiliate_id?: string | null
          approved_user_id?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          experience?: string | null
          full_name: string
          id?: string
          instagram?: string | null
          motivation?: string | null
          pix_key?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          approved_affiliate_id?: string | null
          approved_user_id?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          experience?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          motivation?: string | null
          pix_key?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
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
          ano_formacao: string | null
          bairro: string | null
          birth_date: string | null
          bolsista: boolean
          cep: string | null
          certificado_liberado: boolean
          certifier_notified_at: string | null
          cidade: string | null
          contact_email: string | null
          cpf: string | null
          created_at: string
          curso_escolhido: string | null
          data_final: string | null
          enrollment_form_submitted_at: string | null
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
          certifier_notified_at?: string | null
          cidade?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          curso_escolhido?: string | null
          data_final?: string | null
          enrollment_form_submitted_at?: string | null
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
          certifier_notified_at?: string | null
          cidade?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          curso_escolhido?: string | null
          data_final?: string | null
          enrollment_form_submitted_at?: string | null
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
      support_messages: {
        Row: {
          account_id: string
          body: string
          created_at: string
          id: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          account_id: string
          body: string
          created_at?: string
          id?: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          account_id?: string
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      training_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          training_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          training_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_invitations_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          attachments: Json
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          position: number
          title: string
          training_id: string
          updated_at: string
          video_kind: string
          video_url: string | null
        }
        Insert: {
          attachments?: Json
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          position?: number
          title: string
          training_id: string
          updated_at?: string
          video_kind?: string
          video_url?: string | null
        }
        Update: {
          attachments?: Json
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          position?: number
          title?: string
          training_id?: string
          updated_at?: string
          video_kind?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_meetings: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          meet_url: string
          starts_at: string
          title: string
          training_id: string | null
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          meet_url: string
          starts_at: string
          title: string
          training_id?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          meet_url?: string
          starts_at?: string
          title?: string
          training_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_meetings_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          training_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          training_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          audience: string
          category: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          meet_scheduled_at: string | null
          meet_url: string | null
          position: number
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          meet_scheduled_at?: string | null
          meet_url?: string | null
          position?: number
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          meet_scheduled_at?: string | null
          meet_url?: string | null
          position?: number
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      turma_alunos: {
        Row: {
          account_id: string
          added_at: string
          id: string
          turma_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          added_at?: string
          id?: string
          turma_id: string
          user_id: string
        }
        Update: {
          account_id?: string
          added_at?: string
          id?: string
          turma_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_alunos_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
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
          account_id: string
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
          account_id: string
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
          account_id?: string
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
            foreignKeyName: "turmas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      _profile_self_field: { Args: { _field: string }; Returns: string }
      corp_next_proposal_number: { Args: never; Returns: string }
      crm_can_manage_all: { Args: { _uid: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_affiliate_installments: {
        Args: { _referral_id: string }
        Returns: {
          commission_cents: number
          id: string
          numero: number
          paid_at: string
          status: string
          valor_cents: number
          vencimento: string
        }[]
      }
      get_matricula_course: {
        Args: { _slug: string }
        Returns: {
          description: string
          id: string
          image_url: string
          price_cents: number
          slug: string
          title: string
        }[]
      }
      get_my_affiliate_commissions: {
        Args: never
        Returns: {
          commission_cents: number
          commission_confirmed_at: string
          commission_note: string
          commission_paid_at: string
          course_title: string
          created_at: string
          id: string
          paid_at: string
          status: string
          student_email: string
          student_name: string
          valor_cents: number
        }[]
      }
      has_account_role: {
        Args: {
          _account_id: string
          _funcao: Database["public"]["Enums"]["funcao_conta"]
          _user_id: string
        }
        Returns: boolean
      }
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
      is_account_member: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      is_crm_user: { Args: { _user_id: string }; Returns: boolean }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      lead_bank_get_crm_statuses: {
        Args: { _lead_ids: string[] }
        Returns: {
          crm_lead_id: string
          crm_nome: string
          estagio: Database["public"]["Enums"]["crm_stage"]
          lead_bank_id: string
          owner_id: string
          seller_name: string
          stage_changed_at: string
          status_atendimento: string
          updated_at: string
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
          _situacao?: Database["public"]["Enums"]["lead_bank_situacao"]
        }
        Returns: Json
      }
      lead_bank_send_to_crm: {
        Args: { _lead_bank_id: string; _owner_id?: string }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_username: { Args: never; Returns: string }
      normalize_email: { Args: { _email: string }; Returns: string }
      normalize_phone: { Args: { _phone: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_affiliate_referral: {
        Args: { _enrollment_id: string }
        Returns: undefined
      }
      resolve_account_id: { Args: { _account_id: string }; Returns: string }
      validate_coupon: {
        Args: { _code: string; _course_id?: string }
        Returns: {
          code: string
          course_id: string
          discount_type: string
          discount_value: number
          id: string
          reason: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_permission:
        | "manage_courses"
        | "manage_users"
        | "manage_leads"
        | "view_analytics"
        | "manage_content"
        | "view_commission"
        | "issue_boletos"
        | "settle_boletos"
        | "manage_affiliates"
        | "manage_certification"
      app_role: "super_admin" | "admin" | "editor" | "viewer" | "certificadora"
      connect_campaign_status:
        | "rascunho"
        | "agendada"
        | "enviando"
        | "concluida"
        | "cancelada"
      connect_contact_status:
        | "novo"
        | "interessado"
        | "em_negociacao"
        | "aluno"
        | "ex_aluno"
        | "sem_interesse"
      connect_message_status:
        | "pendente"
        | "enviada"
        | "entregue"
        | "lida"
        | "falhou"
        | "simulada"
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
      funcao_conta:
        | "proprietario"
        | "gerente"
        | "comercial"
        | "financeiro"
        | "suporte"
        | "visualizador"
      lead_bank_situacao:
        | "lista_espera"
        | "aguardando_proxima_turma"
        | "desistente"
        | "ja_atendido"
        | "reengajar"
        | "convertido"
        | "arquivado"
      status_conta_comercial: "ativa" | "suspensa" | "arquivada"
      status_membro_conta: "ativo" | "convidado" | "suspenso" | "removido"
      tipo_conta_comercial:
        | "interno_multplick"
        | "licenciado"
        | "afiliado"
        | "representante"
        | "parceiro_corporativo"
        | "cliente_corporativo"
        | "escola_parceira"
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
        "view_commission",
        "issue_boletos",
        "settle_boletos",
        "manage_affiliates",
        "manage_certification",
      ],
      app_role: ["super_admin", "admin", "editor", "viewer", "certificadora"],
      connect_campaign_status: [
        "rascunho",
        "agendada",
        "enviando",
        "concluida",
        "cancelada",
      ],
      connect_contact_status: [
        "novo",
        "interessado",
        "em_negociacao",
        "aluno",
        "ex_aluno",
        "sem_interesse",
      ],
      connect_message_status: [
        "pendente",
        "enviada",
        "entregue",
        "lida",
        "falhou",
        "simulada",
      ],
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
      funcao_conta: [
        "proprietario",
        "gerente",
        "comercial",
        "financeiro",
        "suporte",
        "visualizador",
      ],
      lead_bank_situacao: [
        "lista_espera",
        "aguardando_proxima_turma",
        "desistente",
        "ja_atendido",
        "reengajar",
        "convertido",
        "arquivado",
      ],
      status_conta_comercial: ["ativa", "suspensa", "arquivada"],
      status_membro_conta: ["ativo", "convidado", "suspenso", "removido"],
      tipo_conta_comercial: [
        "interno_multplick",
        "licenciado",
        "afiliado",
        "representante",
        "parceiro_corporativo",
        "cliente_corporativo",
        "escola_parceira",
      ],
    },
  },
} as const
