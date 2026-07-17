import type { ComponentType } from 'npm:react@18.3.1'
import { template as certifierNewSubmission } from './certifier-new-submission.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string | ((data: any) => string)
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'certifier-new-submission': certifierNewSubmission,
}