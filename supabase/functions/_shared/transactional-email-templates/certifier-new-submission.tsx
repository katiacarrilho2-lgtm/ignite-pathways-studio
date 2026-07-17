import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  studentName?: string
  studentEmail?: string
  course?: string
  panelUrl?: string
  submittedAt?: string
}

const Email = ({ studentName, studentEmail, course, panelUrl, submittedAt }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo aluno com documentação completa para análise</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Multplick — Certificação</Heading>
        <Text style={lead}>
          O aluno abaixo acabou de concluir o envio dos documentos e do formulário de matrícula. Está pronto para sua análise.
        </Text>

        <Section style={card}>
          <Text style={row}><strong>Aluno:</strong> {studentName || '—'}</Text>
          {studentEmail ? <Text style={row}><strong>E-mail:</strong> {studentEmail}</Text> : null}
          {course ? <Text style={row}><strong>Curso:</strong> {course}</Text> : null}
          {submittedAt ? <Text style={row}><strong>Enviado em:</strong> {submittedAt}</Text> : null}
        </Section>

        {panelUrl ? (
          <Section style={{ textAlign: 'center' as const, marginTop: 24 }}>
            <Button href={panelUrl} style={button}>Abrir painel de Certificação</Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={foot}>Você recebeu este aviso porque é responsável pela Certificação e Documentação para Conselhos na Multplick.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Novo envio de documentos — ${d?.studentName || 'aluno'}`,
  displayName: 'Certificadora — novo envio de documentos',
  previewData: {
    studentName: 'Alice Silva',
    studentEmail: 'alice@exemplo.com',
    course: 'Técnico em Enfermagem',
    panelUrl: 'https://multplick-licenciado.lovable.app/admin/certificacao',
    submittedAt: '03/07/2026 15:20',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#0f172a' }
const container = { padding: '28px 24px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 20, margin: '0 0 12px', color: '#0f172a' }
const lead = { fontSize: 14, lineHeight: '22px', color: '#334155', margin: '0 0 18px' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }
const row = { fontSize: 14, margin: '4px 0', color: '#0f172a' }
const button = { backgroundColor: '#0f766e', color: '#ffffff', padding: '12px 22px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }
const hr = { borderColor: '#e2e8f0', margin: '28px 0 12px' }
const foot = { fontSize: 12, color: '#64748b', lineHeight: '18px' }